const repo = require('./notification.repository');
const { getEventDefinition, isKnownEvent } = require('./notification-events.catalog');

let metrics = {
  sent_total: 0,
  failed_total: 0,
};

function getMetrics() {
  return { ...metrics };
}

function incSent() {
  metrics.sent_total += 1;
}

function incFailed() {
  metrics.failed_total += 1;
}

function formatBrl(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return String(amount);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function buildMessage(eventKey, payload) {
  const def = getEventDefinition(eventKey);
  const title = payload.title || def?.label || eventKey;
  let body = payload.body || payload.message || '';

  if (!body) {
    switch (eventKey) {
      case 'auction.bid_placed':
        body = `Seu lance de ${formatBrl(payload.amount)} em "${payload.auctionTitle || 'leilão'}" foi registrado.`;
        break;
      case 'auction.outbid':
        body = `Seu lance foi superado no leilão "${payload.auctionTitle || payload.auctionId || ''}".`;
        break;
      case 'auction.won':
        body = `Parabéns! Você venceu o leilão "${payload.auctionTitle || ''}".`;
        break;
      case 'auction.payment_due':
        body = `Pagamento pendente para o leilão "${payload.auctionTitle || ''}".`;
        break;
      case 'ops.auction.new_bid':
        body = `${payload.customerName || 'Cliente'} deu ${formatBrl(payload.amount)} em "${payload.auctionTitle || 'leilão'}".`;
        break;
      case 'system.test':
        body = payload.testMessage || 'Mensagem de teste da Central RSV360.';
        break;
      default:
        body = title;
    }
  }
  return { title, body };
}

async function sendEmail(to, subject, text, html) {
  const SMTP_HOST = process.env.SMTP_HOST;
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !to) {
    return { success: false, error: 'SMTP não configurado ou destinatário ausente' };
  }
  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host: SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    const from = process.env.SMTP_FROM || `"Reservei Viagens" <${SMTP_USER}>`;
    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html: html || `<p>${text.replace(/\n/g, '<br>')}</p>`,
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'email_error' };
  }
}

async function sendWhatsApp(phone, text) {
  const url = process.env.EVOLUTION_API_URL;
  const key = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE_NAME || 'CaldasMaster';
  if (!url || !key || !phone) {
    return { success: false, error: 'Evolution não configurado ou telefone ausente', mode: 'skipped' };
  }
  const digits = String(phone).replace(/\D/g, '');
  const jid = phone.includes('@') ? phone : `${digits}@s.whatsapp.net`;
  try {
    const res = await fetch(`${url}/message/sendText/${instance}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key },
      body: JSON.stringify({
        number: jid,
        options: { delay: 800 },
        textMessage: { text },
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      return { success: false, error: `evolution_${res.status}`, mode: 'live' };
    }
    return { success: true, mode: 'live' };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'wa_error', mode: 'live' };
  }
}

async function sendPushWebhook(config, audience, title, body, userId, data) {
  const webhook = config?.push_webhook_url || process.env.PUSH_WEBHOOK_URL;
  if (!webhook) {
    return { success: true, mode: 'simulated' };
  }
  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.PUSH_WEBHOOK_SECRET
          ? { Authorization: `Bearer ${process.env.PUSH_WEBHOOK_SECRET}` }
          : {}),
      },
      body: JSON.stringify({ title, body, audience, userId, data: data || {} }),
    });
    if (!res.ok) {
      return { success: false, error: `push_webhook_${res.status}`, mode: 'webhook' };
    }
    return { success: true, mode: 'webhook' };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'push_error', mode: 'webhook' };
  }
}

async function sendSms(phone, text) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !token || !from || !phone) {
    return { success: false, error: 'Twilio não configurado', mode: 'skipped' };
  }
  try {
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const body = new URLSearchParams({ To: phone, From: from, Body: text });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    if (!res.ok) {
      return { success: false, error: `twilio_${res.status}`, mode: 'live' };
    }
    return { success: true, mode: 'live' };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'sms_error', mode: 'live' };
  }
}

function channelEnabled(config, channel) {
  if (!config) return true;
  switch (channel) {
    case 'email':
      return config.email_enabled !== false;
    case 'whatsapp':
      return config.whatsapp_enabled !== false;
    case 'sms':
      return config.sms_enabled === true;
    case 'push':
      return config.push_enabled !== false;
    default:
      return true;
  }
}

/**
 * @param {{
 *   eventKey: string;
 *   propertyId?: number;
 *   userId?: string;
 *   recipient?: { email?: string; phone?: string; name?: string };
 *   payload?: Record<string, unknown>;
 *   channels?: string[];
 *   audience?: 'customer'|'operator'|'organizer';
 * }} input
 */
async function dispatchNotification(input) {
  const eventKey = input.eventKey;
  if (!isKnownEvent(eventKey)) {
    return { success: false, error: 'Evento desconhecido', results: [] };
  }

  const def = getEventDefinition(eventKey);
  const propertyId = input.propertyId || 1;
  const config = await repo.getTenantConfig(propertyId);
  const payload = input.payload || {};
  const { title, body } = buildMessage(eventKey, payload);
  const channels = input.channels || def.defaultChannels || ['in_app'];
  const audience = input.audience || def.audience || 'customer';
  const results = [];

  if (channels.includes('in_app') && input.userId && audience === 'customer') {
    try {
      await repo.pushInbox(input.userId, {
        eventKey,
        title,
        body,
        tipo: eventKey.startsWith('ops.') ? 'alerta' : 'sucesso',
        meta: payload,
      });
      await repo.logDelivery(eventKey, 'in_app', input.userId, 'sent');
      incSent();
      results.push({ channel: 'in_app', success: true });
    } catch (err) {
      incFailed();
      results.push({ channel: 'in_app', success: false, error: 'in_app_error' });
    }
  }

  if (channels.includes('in_app') && audience === 'operator') {
    try {
      await repo.pushOpsFeed(propertyId, {
        eventKey,
        domain: String(payload.domain || eventKey.split('.')[0] || 'general'),
        title,
        body,
        meta: payload,
      });
      await repo.logDelivery(eventKey, 'in_app_ops', config.ops_email || 'ops', 'sent');
      incSent();
      results.push({ channel: 'in_app_ops', success: true });
    } catch {
      incFailed();
      results.push({ channel: 'in_app_ops', success: false });
    }
  }

  const emailTo =
    audience === 'operator'
      ? config.ops_email || process.env.AUCTION_OPERATOR_EMAIL
      : input.recipient?.email;

  if (channels.includes('email') && channelEnabled(config, 'email') && emailTo) {
    const r = await sendEmail(emailTo, title, body);
    await repo.logDelivery(eventKey, 'email', emailTo, r.success ? 'sent' : 'failed', r.error);
    if (r.success) incSent();
    else incFailed();
    results.push({ channel: 'email', success: r.success, error: r.error });
  } else if (channels.includes('email')) {
    results.push({ channel: 'email', success: false, error: 'disabled_or_no_recipient' });
  }

  const phoneTo =
    audience === 'operator'
      ? config.ops_whatsapp || process.env.AUCTION_OPERATOR_WHATSAPP
      : input.recipient?.phone;

  if (channels.includes('whatsapp') && channelEnabled(config, 'whatsapp') && phoneTo) {
    const r = await sendWhatsApp(phoneTo, `*${title}*\n\n${body}`);
    await repo.logDelivery(eventKey, 'whatsapp', phoneTo, r.success ? 'sent' : 'failed', r.error);
    if (r.success) incSent();
    else incFailed();
    results.push({ channel: 'whatsapp', success: r.success, mode: r.mode, error: r.error });
  } else if (channels.includes('whatsapp')) {
    results.push({ channel: 'whatsapp', success: false, error: 'disabled_or_no_recipient' });
  }

  if (channels.includes('sms') && channelEnabled(config, 'sms') && input.recipient?.phone) {
    const r = await sendSms(input.recipient.phone, `${title}: ${body}`);
    await repo.logDelivery(eventKey, 'sms', input.recipient.phone, r.success ? 'sent' : 'failed', r.error);
    if (r.success) incSent();
    else incFailed();
    results.push({ channel: 'sms', success: r.success, error: r.error });
  }

  if (channels.includes('push') && channelEnabled(config, 'push')) {
    const r = await sendPushWebhook(config, audience, title, body, input.userId, payload);
    await repo.logDelivery(eventKey, 'push', input.userId || audience, r.success ? 'sent' : 'failed', r.error);
    if (r.success) incSent();
    else incFailed();
    results.push({ channel: 'push', success: r.success, mode: r.mode, error: r.error });
  }

  return { success: results.some((x) => x.success), eventKey, results };
}

async function sendChannelTest({ channel, propertyId, recipient, actorUserId }) {
  return dispatchNotification({
    eventKey: 'system.test',
    propertyId: propertyId || 1,
    userId: actorUserId ? String(actorUserId) : undefined,
    recipient,
    payload: { testMessage: `Teste ${channel} — Central RSV360`, channel },
    channels: [channel === 'in_app_ops' ? 'in_app' : channel],
    audience: channel === 'in_app_ops' || channel === 'email' && recipient?.email === process.env.AUCTION_OPERATOR_EMAIL
      ? 'operator'
      : 'customer',
  });
}

module.exports = {
  dispatchNotification,
  sendChannelTest,
  getMetrics,
  buildMessage,
};
