/**
 * Admin management API compatível com turismo :3005 /notifications.
 */
const express = require('express');
const { authenticateJwt } = require('../../middleware/auth.middleware');
const catalog = require('./notification-events.catalog');
const repo = require('./notification.repository');
const dispatch = require('./notification-dispatch.service');

const router = express.Router();

const adminAuth = [authenticateJwt, (req, res, next) => {
  if (!catalog.canManageTenantConfig(req.user?.role)) {
    return res.status(403).json({ success: false, error: 'Acesso negado' });
  }
  return next();
}];

/** @type {Map<number, object>} */
const drafts = new Map();
let draftSeq = 1;

function mapInboxRow(row) {
  return {
    id: row.id,
    title: row.title,
    message: row.body,
    type: row.tipo === 'alerta' ? 'warning' : row.tipo === 'sucesso' ? 'success' : 'info',
    priority: 'medium',
    status: row.read ? 'read' : 'unread',
    channel: 'in_app',
    recipient: row.user_id || '',
    sender: 'system',
    created_at: row.created_at,
    category: row.event_key || 'system',
    tags: [],
    is_scheduled: false,
  };
}

function mapDeliveryRow(row) {
  return {
    id: row.id,
    title: row.event_key,
    message: `${row.channel} — ${row.status}`,
    type: row.status === 'failed' ? 'error' : row.status === 'sent' ? 'success' : 'info',
    priority: 'medium',
    status: row.status === 'pending' ? 'scheduled' : 'read',
    channel: row.channel,
    recipient: row.recipient_hash,
    sender: 'hub',
    created_at: row.created_at,
    category: row.event_key,
    tags: [],
    is_scheduled: row.status === 'pending',
  };
}

router.get('/management', ...adminAuth, async (req, res) => {
  try {
    const status = req.query.status;
    const deliveries = await repo.listDeliveries(100);
    let data = deliveries.map(mapDeliveryRow);
    for (const d of drafts.values()) {
      data.unshift(d);
    }
    if (status && status !== 'overview') {
      if (status === 'scheduled') {
        data = data.filter((n) => n.is_scheduled);
      } else {
        data = data.filter((n) => n.status === status);
      }
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erro' });
  }
});

router.get('/stats/overview', ...adminAuth, async (_req, res) => {
  try {
    const deliveries = await repo.listDeliveries(500);
    const sent = deliveries.filter((d) => d.status === 'sent').length;
    const failed = deliveries.filter((d) => d.status === 'failed').length;
    const pending = deliveries.filter((d) => d.status === 'pending').length;
    const m = dispatch.getMetrics();
    res.json({
      success: true,
      data: {
        total_notifications: deliveries.length + drafts.size,
        unread_notifications: pending,
        read_notifications: sent,
        archived_notifications: 0,
        sent_today: sent,
        scheduled_notifications: pending,
        success_rate: deliveries.length ? Math.round((sent / deliveries.length) * 100) : 100,
        average_open_rate: 0,
        total_recipients: deliveries.length,
        active_campaigns: drafts.size,
        hub_sent_total: m.sent_total,
        hub_failed_total: m.failed_total,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erro' });
  }
});

router.post('/', ...adminAuth, async (req, res) => {
  try {
    const { title, message, channel, recipient, category, is_scheduled, scheduled_for } = req.body || {};
    if (!title || !message) {
      return res.status(400).json({ success: false, error: 'title e message são obrigatórios' });
    }
    const id = draftSeq++;
    const row = {
      id,
      title,
      message,
      type: 'info',
      priority: 'medium',
      status: is_scheduled ? 'scheduled' : 'unread',
      channel: channel || 'in_app',
      recipient: recipient || '',
      sender: String(req.user?.id || 'admin'),
      created_at: new Date().toISOString(),
      category: category || 'marketing.campaign',
      tags: [],
      is_scheduled: !!is_scheduled,
      scheduled_for: scheduled_for || null,
    };
    drafts.set(id, row);

    if (!is_scheduled && channel && channel !== 'in_app') {
      await dispatch.sendChannelTest({
        channel,
        propertyId: req.propertyId || 1,
        recipient: { email: recipient, phone: recipient },
        actorUserId: req.user?.id,
      });
    } else if (!is_scheduled) {
      await dispatch.dispatchNotification({
        eventKey: 'marketing.campaign',
        userId: recipient ? String(recipient) : String(req.user?.id),
        payload: { title, body: message, category },
        channels: ['in_app'],
        propertyId: req.propertyId || 1,
      });
    }

    res.status(201).json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erro' });
  }
});

router.put('/:id', ...adminAuth, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const existing = drafts.get(id);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Notificação não encontrada' });
  }
  const updated = { ...existing, ...req.body, id };
  drafts.set(id, updated);
  res.json({ success: true, data: updated });
});

router.delete('/:id', ...adminAuth, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (!drafts.delete(id)) {
    return res.status(404).json({ success: false, error: 'Notificação não encontrada' });
  }
  res.json({ success: true });
});

router.patch('/:id/archive', ...adminAuth, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const existing = drafts.get(id);
  if (existing) {
    existing.status = 'archived';
    drafts.set(id, existing);
    return res.json({ success: true, data: existing });
  }
  res.json({ success: true, data: { id, status: 'archived' } });
});

router.post('/:id/send', ...adminAuth, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const existing = drafts.get(id);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Notificação não encontrada' });
  }
  await dispatch.dispatchNotification({
    eventKey: 'marketing.campaign',
    payload: { title: existing.title, body: existing.message },
    channels: [existing.channel === 'in_app' ? 'in_app' : existing.channel],
    propertyId: req.propertyId || 1,
  });
  existing.status = 'read';
  existing.sent_at = new Date().toISOString();
  drafts.set(id, existing);
  res.json({ success: true, data: existing });
});

router.post('/:id/schedule', ...adminAuth, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const existing = drafts.get(id);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Notificação não encontrada' });
  }
  existing.is_scheduled = true;
  existing.scheduled_for = req.body?.scheduled_for || new Date().toISOString();
  existing.status = 'scheduled';
  drafts.set(id, existing);
  res.json({ success: true, data: existing });
});

router.get('/export/data', ...adminAuth, async (_req, res) => {
  try {
    const deliveries = await repo.listDeliveries(500);
    res.json({ success: true, data: [...drafts.values(), ...deliveries] });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erro' });
  }
});

router.get('/metrics/prometheus', ...adminAuth, (_req, res) => {
  const m = dispatch.getMetrics();
  res.type('text/plain').send(
    `# HELP rsv360_notifications_sent_total Total notifications sent\n`
    + `# TYPE rsv360_notifications_sent_total counter\n`
    + `rsv360_notifications_sent_total ${m.sent_total}\n`
    + `# HELP rsv360_notifications_failed_total Total notifications failed\n`
    + `# TYPE rsv360_notifications_failed_total counter\n`
    + `rsv360_notifications_failed_total ${m.failed_total}\n`,
  );
});

router.get('/config/audit', ...adminAuth, async (req, res) => {
  try {
    const items = await repo.listConfigAudit(propertyIdFromReq(req), 50);
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erro' });
  }
});

function propertyIdFromReq(req) {
  return req.propertyId || req.user?.propertyId || 1;
}

module.exports = router;
