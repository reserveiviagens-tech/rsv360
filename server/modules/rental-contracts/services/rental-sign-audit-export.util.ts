import { sanitizeAuditMetadata, toSignAuditEvent } from './rental-sign-audit.util';

export type SignAuditExportRow = {
  eventId: string;
  signRequestId: string;
  unitId: string;
  eventType: string;
  label: string;
  occurredAt: string;
  actor?: string;
  metadata?: Record<string, unknown>;
};

export const SIGN_AUDIT_EXPORT_MAX_ROWS = 2_000;

function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function signAuditRowsToCsv(rows: SignAuditExportRow[]): string {
  const header = [
    'event_id',
    'sign_request_id',
    'unit_id',
    'event_type',
    'label',
    'occurred_at',
    'actor',
    'metadata_json',
  ].join(',');

  const lines = rows.map((row) =>
    [
      csvCell(row.eventId),
      csvCell(row.signRequestId),
      csvCell(row.unitId),
      csvCell(row.eventType),
      csvCell(row.label),
      csvCell(row.occurredAt),
      csvCell(row.actor ?? ''),
      csvCell(row.metadata ? JSON.stringify(row.metadata) : ''),
    ].join(','),
  );

  return `\uFEFF${header}\n${lines.join('\n')}\n`;
}

export function mapRawEventToExportRow(
  signRequestId: string,
  unitId: string,
  raw: {
    id: string;
    eventType: string;
    occurredAt: string;
    metadata?: Record<string, unknown>;
  },
): SignAuditExportRow {
  const dto = toSignAuditEvent({
    id: raw.id,
    eventType: raw.eventType,
    occurredAt: raw.occurredAt,
    metadata: raw.metadata,
  });
  return {
    eventId: raw.id,
    signRequestId,
    unitId,
    eventType: raw.eventType,
    label: dto.label,
    occurredAt: raw.occurredAt,
    actor: dto.actor,
    metadata: sanitizeAuditMetadata(raw.metadata),
  };
}