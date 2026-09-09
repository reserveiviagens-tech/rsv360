const crypto = require('crypto');
const { Pool } = require('pg');

/** @type {import('pg').Pool | null} */
let pool = null;

/** In-memory fallback when DATABASE_URL is absent (tests/dev). */
const mem = {
  inbox: new Map(),
  opsFeed: [],
  preferences: new Map(),
  tenantConfig: new Map(),
  deliveries: [],
  deviceTokens: new Map(),
  audit: [],
};

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

function hashRecipient(value) {
  if (!value) return 'unknown';
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 32);
}

function defaultTenantConfig(propertyId = 1) {
  return {
    property_id: propertyId,
    enterprise_id: null,
    email_enabled: true,
    whatsapp_enabled: true,
    sms_enabled: false,
    push_enabled: true,
    ops_whatsapp: process.env.AUCTION_OPERATOR_WHATSAPP || null,
    ops_email: process.env.AUCTION_OPERATOR_EMAIL || null,
    push_webhook_url: process.env.PUSH_WEBHOOK_URL || null,
  };
}

async function init() {
  const db = getPool();
  if (!db) return;
  await db.query(`
    SELECT 1 FROM notification_tenant_config LIMIT 1
  `).catch(() => null);
}

async function getTenantConfig(propertyId = 1) {
  const db = getPool();
  if (!db) {
    const key = String(propertyId);
    if (!mem.tenantConfig.has(key)) {
      mem.tenantConfig.set(key, defaultTenantConfig(propertyId));
    }
    return mem.tenantConfig.get(key);
  }
  const res = await db.query(
    `SELECT * FROM notification_tenant_config WHERE property_id = $1 LIMIT 1`,
    [propertyId],
  );
  if (res.rows[0]) return res.rows[0];
  const defaults = defaultTenantConfig(propertyId);
  await db.query(
    `INSERT INTO notification_tenant_config (property_id, ops_whatsapp, ops_email, push_webhook_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (property_id) DO NOTHING`,
    [propertyId, defaults.ops_whatsapp, defaults.ops_email, defaults.push_webhook_url],
  );
  const again = await db.query(
    `SELECT * FROM notification_tenant_config WHERE property_id = $1 LIMIT 1`,
    [propertyId],
  );
  return again.rows[0] || defaults;
}

async function upsertTenantConfig(propertyId, patch, actorUserId) {
  const db = getPool();
  const allowed = [
    'email_enabled',
    'whatsapp_enabled',
    'sms_enabled',
    'push_enabled',
    'ops_whatsapp',
    'ops_email',
    'push_webhook_url',
  ];
  const fields = {};
  for (const k of allowed) {
    if (patch[k] !== undefined) fields[k] = patch[k];
  }
  if (Object.keys(fields).length === 0) {
    return getTenantConfig(propertyId);
  }

  if (!db) {
    const current = await getTenantConfig(propertyId);
    const merged = { ...current, ...fields, property_id: propertyId };
    mem.tenantConfig.set(String(propertyId), merged);
    mem.audit.unshift({
      property_id: propertyId,
      actor_user_id: actorUserId,
      action: 'tenant_config_update',
      meta: { fields: Object.keys(fields) },
      created_at: new Date().toISOString(),
    });
    return merged;
  }

  const sets = Object.keys(fields).map((k, i) => `${k} = $${i + 2}`);
  const values = Object.values(fields);
  await db.query(
    `INSERT INTO notification_tenant_config (property_id) VALUES ($1)
     ON CONFLICT (property_id) DO NOTHING`,
    [propertyId],
  );
  await db.query(
    `UPDATE notification_tenant_config SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE property_id = $1`,
    [propertyId, ...values],
  );
  await db.query(
    `INSERT INTO notification_config_audit (property_id, actor_user_id, action, meta)
     VALUES ($1, $2, 'tenant_config_update', $3)`,
    [propertyId, actorUserId ? String(actorUserId) : null, JSON.stringify({ fields: Object.keys(fields) })],
  );
  return getTenantConfig(propertyId);
}

async function listInbox(userId, limit = 50) {
  const db = getPool();
  if (!db) {
    const items = mem.inbox.get(String(userId)) || [];
    return items.slice(0, limit);
  }
  const res = await db.query(
    `SELECT id, user_id, event_key, title, body, tipo, read, meta, created_at
     FROM notification_inbox WHERE user_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [String(userId), limit],
  );
  return res.rows;
}

async function pushInbox(userId, item) {
  const row = {
    user_id: String(userId),
    event_key: item.eventKey || null,
    title: item.title,
    body: item.body,
    tipo: item.tipo || 'info',
    read: false,
    meta: item.meta || null,
    created_at: new Date().toISOString(),
  };
  const db = getPool();
  if (!db) {
    const list = mem.inbox.get(String(userId)) || [];
    const withId = { id: `mem-${Date.now()}`, ...row };
    mem.inbox.set(String(userId), [withId, ...list].slice(0, 200));
    return withId;
  }
  const res = await db.query(
    `INSERT INTO notification_inbox (user_id, event_key, title, body, tipo, meta)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, event_key, title, body, tipo, read, meta, created_at`,
    [row.user_id, row.event_key, row.title, row.body, row.tipo, row.meta ? JSON.stringify(row.meta) : null],
  );
  return res.rows[0];
}

async function markInboxRead(userId, notificationId) {
  const db = getPool();
  if (!db) {
    const list = mem.inbox.get(String(userId)) || [];
    const found = list.find((n) => String(n.id) === String(notificationId));
    if (!found) return null;
    found.read = true;
    return found;
  }
  const res = await db.query(
    `UPDATE notification_inbox SET read = true
     WHERE id = $1 AND user_id = $2
     RETURNING id, user_id, event_key, title, body, tipo, read, meta, created_at`,
    [notificationId, String(userId)],
  );
  return res.rows[0] || null;
}

async function listOpsFeed(propertyId = 1, limit = 100) {
  const db = getPool();
  if (!db) {
    return mem.opsFeed.filter((n) => n.property_id === propertyId).slice(0, limit);
  }
  const res = await db.query(
    `SELECT id, property_id, domain, event_key, title, body, tipo, acknowledged, meta, created_at
     FROM notification_ops_feed WHERE property_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [propertyId, limit],
  );
  return res.rows;
}

async function pushOpsFeed(propertyId, item) {
  const row = {
    property_id: propertyId,
    domain: item.domain || 'general',
    event_key: item.eventKey || null,
    title: item.title,
    body: item.body,
    tipo: item.tipo || 'alerta',
    acknowledged: false,
    meta: item.meta || null,
    created_at: new Date().toISOString(),
  };
  const db = getPool();
  if (!db) {
    const withId = { id: `ops-${Date.now()}`, ...row };
    mem.opsFeed.unshift(withId);
    if (mem.opsFeed.length > 500) mem.opsFeed.length = 500;
    return withId;
  }
  const res = await db.query(
    `INSERT INTO notification_ops_feed (property_id, domain, event_key, title, body, tipo, meta)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, property_id, domain, event_key, title, body, tipo, acknowledged, meta, created_at`,
    [propertyId, row.domain, row.event_key, row.title, row.body, row.tipo, row.meta ? JSON.stringify(row.meta) : null],
  );
  return res.rows[0];
}

async function acknowledgeOpsFeed(id) {
  const db = getPool();
  if (!db) {
    const item = mem.opsFeed.find((n) => String(n.id) === String(id));
    if (!item) return null;
    item.acknowledged = true;
    return item;
  }
  const res = await db.query(
    `UPDATE notification_ops_feed SET acknowledged = true WHERE id = $1
     RETURNING id, property_id, domain, event_key, title, body, tipo, acknowledged, meta, created_at`,
    [id],
  );
  return res.rows[0] || null;
}

async function getPreferences(userId) {
  const db = getPool();
  if (!db) {
    return mem.preferences.get(String(userId)) || [];
  }
  const res = await db.query(
    `SELECT category, channel, enabled FROM notification_preferences WHERE user_id = $1`,
    [String(userId)],
  );
  return res.rows;
}

async function upsertPreference(userId, category, channel, enabled) {
  const db = getPool();
  if (!db) {
    const list = mem.preferences.get(String(userId)) || [];
    const idx = list.findIndex((p) => p.category === category && p.channel === channel);
    const row = { category, channel, enabled };
    if (idx >= 0) list[idx] = row;
    else list.push(row);
    mem.preferences.set(String(userId), list);
    return row;
  }
  await db.query(
    `INSERT INTO notification_preferences (user_id, category, channel, enabled)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, category, channel)
     DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = CURRENT_TIMESTAMP`,
    [String(userId), category, channel, enabled],
  );
  return { category, channel, enabled };
}

async function logDelivery(eventKey, channel, recipient, status, errorCode, meta) {
  const recipientHash = hashRecipient(recipient);
  const row = {
    event_key: eventKey,
    channel,
    recipient_hash: recipientHash,
    status,
    error_code: errorCode || null,
    meta: meta || null,
    created_at: new Date().toISOString(),
  };
  const db = getPool();
  if (!db) {
    mem.deliveries.unshift({ id: mem.deliveries.length + 1, ...row });
    if (mem.deliveries.length > 1000) mem.deliveries.length = 1000;
    return row;
  }
  const res = await db.query(
    `INSERT INTO notification_deliveries (event_key, channel, recipient_hash, status, error_code, meta)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, event_key, channel, recipient_hash, status, error_code, created_at`,
    [eventKey, channel, recipientHash, status, errorCode, row.meta ? JSON.stringify(row.meta) : null],
  );
  return res.rows[0];
}

async function listDeliveries(limit = 50) {
  const db = getPool();
  if (!db) {
    return mem.deliveries.slice(0, limit);
  }
  const res = await db.query(
    `SELECT id, event_key, channel, recipient_hash, status, error_code, created_at
     FROM notification_deliveries ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );
  return res.rows;
}

async function purgeOldDeliveries(retentionDays = 90) {
  const db = getPool();
  if (!db) return { deleted: 0 };
  const res = await db.query(
    `DELETE FROM notification_deliveries
     WHERE created_at < NOW() - ($1 || ' days')::interval`,
    [retentionDays],
  );
  return { deleted: res.rowCount || 0 };
}

async function listConfigAudit(propertyId = 1, limit = 50) {
  const db = getPool();
  if (!db) {
    return mem.audit.filter((a) => a.property_id === propertyId).slice(0, limit);
  }
  const res = await db.query(
    `SELECT id, property_id, actor_user_id, action, meta, created_at
     FROM notification_config_audit
     WHERE property_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [propertyId, limit],
  );
  return res.rows;
}

module.exports = {
  init,
  getTenantConfig,
  upsertTenantConfig,
  listInbox,
  pushInbox,
  markInboxRead,
  listOpsFeed,
  pushOpsFeed,
  acknowledgeOpsFeed,
  getPreferences,
  upsertPreference,
  logDelivery,
  listDeliveries,
  purgeOldDeliveries,
  listConfigAudit,
  hashRecipient,
};
