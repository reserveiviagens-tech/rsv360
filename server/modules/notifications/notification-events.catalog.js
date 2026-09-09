/**
 * Catálogo canônico de eventos de notificação RSV360 (CNU).
 * @see docs — Central Geral de Notificações
 */

/** @typedef {'transactional'|'marketing'|'ops'|'organizer'} NotificationCategory */
/** @typedef {'in_app'|'email'|'whatsapp'|'sms'|'push'|'websocket'} NotificationChannel */

/**
 * @type {Record<string, {
 *   label: string;
 *   category: NotificationCategory;
 *   audience: 'customer'|'operator'|'organizer';
 *   defaultChannels: NotificationChannel[];
 *   minRoleDispatch?: string;
 * }>}
 */
const NOTIFICATION_EVENTS = {
  'auction.bid_placed': {
    label: 'Lance registrado',
    category: 'transactional',
    audience: 'customer',
    defaultChannels: ['in_app', 'email', 'whatsapp', 'push'],
  },
  'auction.outbid': {
    label: 'Lance superado',
    category: 'transactional',
    audience: 'customer',
    defaultChannels: ['in_app', 'push', 'email'],
  },
  'auction.won': {
    label: 'Leilão vencido',
    category: 'transactional',
    audience: 'customer',
    defaultChannels: ['in_app', 'email', 'whatsapp', 'push'],
  },
  'auction.payment_due': {
    label: 'Pagamento do leilão pendente',
    category: 'transactional',
    audience: 'customer',
    defaultChannels: ['in_app', 'email', 'whatsapp', 'push'],
  },
  'excursion.payment_confirmed': {
    label: 'Pagamento excursão confirmado',
    category: 'transactional',
    audience: 'customer',
    defaultChannels: ['in_app', 'whatsapp'],
  },
  'excursion.invite_approved': {
    label: 'Convite excursão aprovado',
    category: 'transactional',
    audience: 'customer',
    defaultChannels: ['in_app', 'whatsapp'],
  },
  'ticket.voucher_ready': {
    label: 'Voucher disponível',
    category: 'transactional',
    audience: 'customer',
    defaultChannels: ['in_app', 'email', 'whatsapp'],
  },
  'booking.confirmed': {
    label: 'Reserva confirmada',
    category: 'transactional',
    audience: 'customer',
    defaultChannels: ['in_app', 'email', 'push'],
  },
  'guest.request_updated': {
    label: 'Atualização de solicitação',
    category: 'transactional',
    audience: 'customer',
    defaultChannels: ['in_app'],
  },
  'proposal.message': {
    label: 'Nova mensagem proposta',
    category: 'transactional',
    audience: 'customer',
    defaultChannels: ['in_app', 'push'],
  },
  'marketing.campaign': {
    label: 'Campanha marketing',
    category: 'marketing',
    audience: 'customer',
    defaultChannels: ['email', 'whatsapp', 'sms'],
  },
  'ops.auction.new_bid': {
    label: 'Novo lance (operador)',
    category: 'ops',
    audience: 'operator',
    defaultChannels: ['in_app', 'email', 'whatsapp', 'push'],
  },
  'ops.excursion.new_member': {
    label: 'Novo membro excursão',
    category: 'ops',
    audience: 'operator',
    defaultChannels: ['in_app', 'push'],
  },
  'ops.voucher.delivery_failed': {
    label: 'Falha entrega voucher',
    category: 'ops',
    audience: 'operator',
    defaultChannels: ['in_app', 'email'],
  },
  'ops.payment.webhook_failure': {
    label: 'Falha webhook pagamento',
    category: 'ops',
    audience: 'operator',
    defaultChannels: ['in_app'],
  },
  'ops.hk.task_assigned': {
    label: 'Tarefa housekeeping',
    category: 'ops',
    audience: 'operator',
    defaultChannels: ['in_app', 'push'],
  },
  'organizer.group.member_joined': {
    label: 'Membro entrou no grupo',
    category: 'organizer',
    audience: 'organizer',
    defaultChannels: ['in_app', 'websocket'],
  },
  'organizer.group.payment_received': {
    label: 'Pagamento recebido no grupo',
    category: 'organizer',
    audience: 'organizer',
    defaultChannels: ['in_app', 'whatsapp'],
  },
  'organizer.meta.achieved': {
    label: 'Meta conquistada',
    category: 'organizer',
    audience: 'organizer',
    defaultChannels: ['in_app'],
  },
  'system.test': {
    label: 'Teste de canal',
    category: 'ops',
    audience: 'operator',
    defaultChannels: ['in_app', 'email', 'whatsapp', 'sms', 'push'],
  },
};

const OPERATOR_ROLES = new Set(['admin', 'manager', 'operador', 'operator', 'supervisor', 'staff']);
const ADMIN_ROLES = new Set(['admin', 'manager']);

function getEventDefinition(eventKey) {
  return NOTIFICATION_EVENTS[eventKey] || null;
}

function listEvents() {
  return Object.entries(NOTIFICATION_EVENTS).map(([key, def]) => ({
    key,
    ...def,
  }));
}

function isKnownEvent(eventKey) {
  return Boolean(NOTIFICATION_EVENTS[eventKey]);
}

function canAccessOpsFeed(role) {
  return role && OPERATOR_ROLES.has(String(role));
}

function canManageTenantConfig(role) {
  return role && ADMIN_ROLES.has(String(role));
}

module.exports = {
  NOTIFICATION_EVENTS,
  getEventDefinition,
  listEvents,
  isKnownEvent,
  canAccessOpsFeed,
  canManageTenantConfig,
  OPERATOR_ROLES,
  ADMIN_ROLES,
};
