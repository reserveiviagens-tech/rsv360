/**
 * Minimal settings API for turismo :3005 compatibility.
 * Notification category delegates to CNU tenant config; other categories are static defaults.
 */
const express = require('express');
const { authenticateJwt, requireRole } = require('../../middleware/auth.middleware');
const repo = require('./notification.repository');

const router = express.Router();
const adminAuth = [authenticateJwt, requireRole('admin', 'manager')];

const STATIC_DEFAULTS = {
  empresa: {
    company_name: { value: 'Reservei Viagens', type: 'text', category: 'empresa' },
    company_email: { value: 'contato@reservei.com.br', type: 'text', category: 'empresa' },
  },
  seguranca: {
    two_factor_auth: { value: false, type: 'boolean', category: 'seguranca' },
  },
  pagamento: {
    payment_currency: { value: 'BRL', type: 'text', category: 'pagamento' },
  },
  backup: {
    auto_backup: { value: true, type: 'boolean', category: 'backup' },
  },
};

async function notificacoesSettings(propertyId) {
  const c = await repo.getTenantConfig(propertyId);
  return {
    email_notifications: { id: 'email_notifications', value: c.email_enabled, type: 'boolean', category: 'notificacoes' },
    sms_notifications: { id: 'sms_notifications', value: c.sms_enabled, type: 'boolean', category: 'notificacoes' },
    push_notifications: { id: 'push_notifications', value: c.push_enabled, type: 'boolean', category: 'notificacoes' },
    whatsapp_notifications: { id: 'whatsapp_notifications', value: c.whatsapp_enabled, type: 'boolean', category: 'notificacoes' },
    notification_sound: { id: 'notification_sound', value: true, type: 'boolean', category: 'notificacoes' },
  };
}

router.get('/', ...adminAuth, async (req, res) => {
  try {
    const propertyId = req.propertyId || 1;
    const notif = await notificacoesSettings(propertyId);
    const flat = {
      ...STATIC_DEFAULTS.empresa,
      ...STATIC_DEFAULTS.seguranca,
      ...STATIC_DEFAULTS.pagamento,
      ...STATIC_DEFAULTS.backup,
      ...notif,
    };
    res.json({ success: true, settings: flat });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erro' });
  }
});

router.patch('/category/:category/:settingId', ...adminAuth, async (req, res) => {
  try {
    const { category, settingId } = req.params;
    const { value } = req.body || {};
    if (category === 'notificacoes') {
      const map = {
        email_notifications: 'email_enabled',
        sms_notifications: 'sms_enabled',
        push_notifications: 'push_enabled',
        whatsapp_notifications: 'whatsapp_enabled',
      };
      const field = map[settingId];
      if (field) {
        await repo.upsertTenantConfig(req.propertyId || 1, { [field]: value }, req.user?.id);
        return res.json({ success: true, setting: { id: settingId, value, category } });
      }
    }
    res.json({ success: true, setting: { id: settingId, value, category } });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erro' });
  }
});

router.put('/category/:category', ...adminAuth, async (req, res) => {
  res.json({ success: true, updated: Object.keys(req.body || {}).length });
});

router.post('/reset', ...adminAuth, async (_req, res) => {
  res.json({ success: true, message: 'Reset parcial — apenas notificações persistidas no hub' });
});

router.post('/backup/create', ...adminAuth, async (_req, res) => {
  res.json({ success: true, backup: { created_at: new Date().toISOString() } });
});

router.post('/backup/restore', ...adminAuth, async (_req, res) => {
  res.json({ success: true });
});

module.exports = router;
