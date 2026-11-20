import type { crmLeads } from '../../../backend/src/db/schema/crm-lintel';
import type { LeadApiRow, LeadApiStatus } from './schema';

function maskEmail(email: string | null | undefined): string {
  if (!email?.trim()) return '—';
  const [local, domain] = email.split('@');
  if (!domain) return '•••••';
  const maskedLocal = local.length > 2 ? `${local.slice(0, 2)}•••••` : '•••••';
  return `${maskedLocal}@${domain}`;
}

function maskPhone(phone: string | null | undefined): string {
  if (!phone?.trim()) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  return `•••• •••• ${digits.slice(-4)}`;
}

function dbStatusToApi(status: string | null | undefined): LeadApiStatus {
  const s = (status ?? 'novo').toLowerCase();
  if (s === 'convertido' || s === 'qualified') return 'qualified';
  if (s === 'contatado' || s === 'contacted') return 'contacted';
  return 'new';
}

export function apiStatusToDb(status: LeadApiStatus): string {
  if (status === 'qualified') return 'convertido';
  if (status === 'contacted') return 'contatado';
  return 'novo';
}

function relativeTime(iso: Date | string | null | undefined): string {
  if (!iso) return 'recente';
  const created = iso instanceof Date ? iso : new Date(iso);
  const diffMs = Date.now() - created.getTime();
  const hours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)));
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function scoreFromStatus(status: LeadApiStatus): number {
  if (status === 'qualified') return 92;
  if (status === 'contacted') return 78;
  return 68;
}

function defaultFit(score: number): LeadApiRow['fitFactors'] {
  return {
    budgetFit: Math.min(98, score + 4),
    timeline: Math.min(95, score - 6),
    financing: Math.min(96, score - 2),
  };
}

export function rowToLeadApiRow(
  row: typeof crmLeads.$inferSelect,
  dealId?: string | null,
): LeadApiRow {
  const status = dbStatusToApi(row.status);
  const score = scoreFromStatus(status);
  const name = row.clientName?.trim() || 'Lead sem nome';

  return {
    id: row.id,
    name,
    email: maskEmail(row.clientEmail),
    phone: maskPhone(row.clientPhone),
    score,
    intent: 'buy',
    budget: 'Sob consulta',
    source: row.source || 'direct',
    time: relativeTime(row.createdAt),
    status,
    fitFactors: defaultFit(score),
    notes: row.notes ?? undefined,
    createdAt: row.createdAt?.toISOString(),
    dealId: dealId ?? undefined,
  };
}

export type MemoryLeadRecord = {
  id: string;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  source: string;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  dealId?: string | null;
};

export function memoryRecordToRow(rec: MemoryLeadRecord): LeadApiRow {
  const pseudo = {
    id: rec.id,
    clientName: rec.clientName,
    clientEmail: rec.clientEmail,
    clientPhone: rec.clientPhone,
    source: rec.source,
    status: rec.status,
    notes: rec.notes,
    assignedUserId: null,
    createdAt: new Date(rec.createdAt),
    updatedAt: new Date(rec.updatedAt),
  } as typeof crmLeads.$inferSelect;

  return rowToLeadApiRow(pseudo, rec.dealId);
}