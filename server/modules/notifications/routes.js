const express = require('express');
const { authenticateJwt, requireRole } = require('../../middleware/auth.middleware');
const repo = require('./notification.repository');
const dispatch = require('./notification-dispatch.service');
const catalog = require('./notification-events.catalog');

const router = express.Router();

const customerAuth = [authenticateJwt];
const opsAuth = [authenticateJwt, (req, res, next) => {
  if (!catalog.canAccessOpsFeed(req.user?.role)) {
    return res.status(403).json({ success: false, error: 'Acesso negado' });
  }
  return next();
}];
const adminAuth = [authenticateJwt, (req, res, next) => {
  if (!catalog.canManageTenantConfig(req.user?.role)) {
    return res.status(403).json({ success: false, error: 'Acesso negado' });
  }
  return next();
}];

function propertyIdFromReq(req) {
  return req.propertyId || req.user?.propertyId || 1;
}

function internalDispatchAuth(req, res, next) {
  const secret = process.env.NOTIFICATION_DISPATCH_SECRET || process.env.INTERNAL_API_SECRET;
  const header = req.headers['x-notification-secret'] || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (secret && header === secret) return next();
  if (req.user?.role === 'admin' || req.user?.role === 'manager') return next();
  return res.status(401).json({ success: false, error: 'Não autorizado' });
}

function dispatchAuth(req, res, next) {
  const secret = process.env.NOTIFICATION_DISPATCH_SECRET || process.env.INTERNAL_API_SECRET;
  const header = req.headers['x-notification-secret'] || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (secret && header === secret) {
    return next();
  }
  return authenticateJwt(req, res, () => internalDispatchAuth(req, res, next));
}

router.get('/ops/feed/internal', dispatchAuth, async (req, res) => {
  try {
    const propertyId = parseInt(String(req.query.propertyId || '1'), 10);
    const items = await repo.listOpsFeed(propertyId);
    res.json({
      success: true,
      items: items.map((n) => ({
        id: String(n.id),
        titulo: n.title,
        mensagem: n.body,
        lida: !!n.acknowledged,
        criadoEm: n.created_at,
      })),
      naoLidas: items.filter((n) => !n.acknowledged).length,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erro' });
  }
});

router.patch('/ops/feed/:id/ack/internal', dispatchAuth, async (req, res) => {
  try {
    const item = await repo.acknowledgeOpsFeed(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Item não encontrado' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erro' });
  }
});

router.get('/config/tenant/internal', dispatchAuth, async (req, res) => {
  try {
    const propertyId = parseInt(String(req.query.propertyId || '1'), 10);
    const config = await repo.getTenantConfig(propertyId);
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erro' });
  }
});

router.put('/config/tenant/internal', dispatchAuth, async (req, res) => {
  try {
    const propertyId = parseInt(String(req.query.propertyId || '1'), 10);
    const config = await repo.upsertTenantConfig(propertyId, req.body || {}, null);
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erro' });
  }
});

router.post('/test/internal', dispatchAuth, async (req, res) => {
  try {
    const { channel, email, phone, propertyId } = req.body || {};
    if (!channel) {
      return res.status(400).json({ success: false, error: 'channel é obrigatório' });
    }
    const result = await dispatch.sendChannelTest({
      channel,
      propertyId: propertyId || 1,
      recipient: { email, phone },
    });
    res.json({ success: result.success, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erro' });
  }
});

router.get('/inbox/:userId', dispatchAuth, async (req, res) => {
  try {
    const userId = String(req.params.userId);
    const items = await repo.listInbox(userId);
    const naoLidas = items.filter((n) => !n.read).length;
    res.json({ success: true, items, naoLidas });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erro' });
  }
});

router.patch('/preferences/:userId', dispatchAuth, async (req, res) => {
  try {
    const { category, channel, enabled } = req.body || {};
    if (!category || !channel || typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, error: 'category, channel e enabled são obrigatórios' });
    }
    const row = await repo.upsertPreference(String(req.params.userId), category, channel, enabled);
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erro' });
  }
});

router.get('/preferences/:userId', dispatchAuth, async (req, res) => {
  try {
    const prefs = await repo.getPreferences(String(req.params.userId));
    res.json({ success: true, data: prefs });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erro' });
  }
});

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    module: 'notifications',
    metrics: dispatch.getMetrics(),
    events: catalog.listEvents().length,
  });
});

router.get('/catalog/events', ...customerAuth, (_req, res) => {
  res.json({ success: true, data: catalog.listEvents() });
});

router.get('/preferences', ...customerAuth, async (req, res) => {
  try {
    const prefs = await repo.getPreferences(String(req.user.id));
    res.json({ success: true, data: prefs });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erro' });
  }
});

router.patch('/preferences', ...customerAuth, async (req, res) => {
  try {
    const { category, channel, enabled } = req.body || {};
    if (!category || !channel || typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, error: 'category, channel e enabled são obrigatórios' });
    }
    const row = await repo.upsertPreference(String(req.user.id), category, channel, enabled);
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erro' });
  }
});

router.get('/ops/feed', ...opsAuth, async (req, res) => {
  try {
    const propertyId = propertyIdFromReq(req);
    const items = await repo.listOpsFeed(propertyId);
    res.json({
      success: true,
      items,
      naoLidas: items.filter((n) => !n.acknowledged).length,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erro' });
  }
});

router.patch('/ops/feed/:id/ack', ...opsAuth, async (req, res) => {
  try {
    const item = await repo.acknowledgeOpsFeed(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Item não encontrado' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erro' });
  }
});

router.get('/config/tenant', ...adminAuth, async (req, res) => {
  try {
    const config = await repo.getTenantConfig(propertyIdFromReq(req));
    res.json({
      success: true,
      data: {
        ...config,
        push_webhook_url: config.push_webhook_url ? '***configured***' : null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erro' });
  }
});

router.put('/config/tenant', ...adminAuth, async (req, res) => {
  try {
    const config = await repo.upsertTenantConfig(
      propertyIdFromReq(req),
      req.body || {},
      req.user?.id,
    );
    res.json({
      success: true,
      data: {
        ...config,
        push_webhook_url: config.push_webhook_url ? '***configured***' : null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erro' });
  }
});

router.get('/deliveries', ...adminAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '50'), 10) || 50, 200);
    const items = await repo.listDeliveries(limit);
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erro' });
  }
});

router.get('/', ...customerAuth, async (req, res) => {
  try {
    const userId = String(req.user.id);
    const items = await repo.listInbox(userId);
    const naoLidas = items.filter((n) => !n.read).length;
    res.json({ success: true, items, naoLidas });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erro' });
  }
});

router.patch('/:id/read', ...customerAuth, async (req, res) => {
  try {
    const item = await repo.markInboxRead(String(req.user.id), req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Notificação não encontrada' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erro' });
  }
});

router.post('/test', ...adminAuth, async (req, res) => {
  try {
    const { channel, email, phone } = req.body || {};
    if (!channel) {
      return res.status(400).json({ success: false, error: 'channel é obrigatório' });
    }
    const result = await dispatch.sendChannelTest({
      channel,
      propertyId: propertyIdFromReq(req),
      recipient: { email, phone },
      actorUserId: req.user?.id,
    });
    res.json({ success: result.success, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erro' });
  }
});

router.post('/dispatch', dispatchAuth, async (req, res) => {
  try {
    const { eventKey, userId, recipient, payload, channels, audience, propertyId } = req.body || {};
    if (!eventKey) {
      return res.status(400).json({ success: false, error: 'eventKey é obrigatório' });
    }
    const result = await dispatch.dispatchNotification({
      eventKey,
      userId: userId ? String(userId) : undefined,
      recipient,
      payload,
      channels,
      audience,
      propertyId: propertyId || propertyIdFromReq(req),
    });
    res.status(result.success ? 200 : 502).json({ success: result.success, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erro' });
  }
});

/** Alias compatível com turismo settings — categoria notificações */
router.get('/settings/notificacoes', ...adminAuth, async (req, res) => {
  try {
    const config = await repo.getTenantConfig(propertyIdFromReq(req));
    res.json({
      success: true,
      data: {
        email_notifications: config.email_enabled,
        sms_notifications: config.sms_enabled,
        push_notifications: config.push_enabled,
        whatsapp_notifications: config.whatsapp_enabled,
        ops_email: config.ops_email,
        ops_whatsapp: config.ops_whatsapp,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erro' });
  }
});

router.patch('/settings/notificacoes/:key', ...adminAuth, async (req, res) => {
  try {
    const map = {
      email_notifications: 'email_enabled',
      sms_notifications: 'sms_enabled',
      push_notifications: 'push_enabled',
      whatsapp_notifications: 'whatsapp_enabled',
      ops_email: 'ops_email',
      ops_whatsapp: 'ops_whatsapp',
    };
    const field = map[req.params.key];
    if (!field) return res.status(404).json({ success: false, error: 'Configuração desconhecida' });
    const config = await repo.upsertTenantConfig(
      propertyIdFromReq(req),
      { [field]: req.body?.value },
      req.user?.id,
    );
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erro' });
  }
});

module.exports = router;
