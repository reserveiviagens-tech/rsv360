export type SignAuditEventDto = {
  id: string;
  eventType: string;
  label: string;
  occurredAt: string;
  actor?: string;
  metadata?: Record<string, unknown>;
};

const EVENT_LABELS: Record<string, string> = {
  created: 'Pedido criado',
  email_sent: 'Convite por e-mail enviado',
  email_skipped: 'E-mail não enviado (provedor indisponível)',
  viewed: 'Minuta visualizada',
  signed: 'Assinatura concluída',
  expired: 'Prazo expirado',
  revoked: 'Solicitação revogada',
  webhook_delivered: 'Webhook pós-assinatura entregue',
  webhook_failed: 'Falha ao entregar webhook (retry)',
};

function isForbiddenMetadataKey(key: string): boolean {
  return /token|signing|password|secret|cpf/i.test(key) || key === 'email';
}

export function maskClientIp(raw: string | undefined): string | undefined {
  if (!raw || raw === 'unknown') return undefined;
  const ip = raw.split(',')[0].trim();
  if (ip.includes(':')) return 'ipv6:***';
  const parts = ip.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
  return '***';
}

export function sanitizeAuditMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (isForbiddenMetadataKey(key)) continue;
    if (typeof value === 'string' && /token|bearer/i.test(value)) continue;
    out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function toSignAuditEvent(row: {
  id: string;
  eventType: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}): SignAuditEventDto {
  return {
    id: row.id,
    eventType: row.eventType,
    label: EVENT_LABELS[row.eventType] ?? row.eventType,
    occurredAt: row.occurredAt,
    actor: typeof row.metadata?.actor === 'string' ? row.metadata.actor : undefined,
    metadata: sanitizeAuditMetadata(row.metadata),
  };
}