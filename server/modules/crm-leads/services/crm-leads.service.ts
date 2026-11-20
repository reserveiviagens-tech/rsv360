import type { LeadApiRow, LeadApiStatus } from '../schema';
import { memoryListLeads, memoryResetForTests, memoryUpdateLeadStatus } from './crm-leads-memory.store';
import { postgresListLeads, postgresUpdateLeadStatus } from './crm-leads-postgres.repository';

export class CrmLeadsNotFoundError extends Error {
  constructor(message = 'Lead não encontrado') {
    super(message);
    this.name = 'CrmLeadsNotFoundError';
  }
}

export function crmLeadsUsePostgres(): boolean {
  if (process.env.JEST_WORKER_ID) return false;
  const mode = process.env.CRM_LEADS_PERSISTENCE ?? process.env.DEALS_PERSISTENCE ?? 'postgres';
  if (mode === 'memory') return false;
  return mode === 'postgres' && Boolean(process.env.DATABASE_URL);
}

export async function listLeadsAsync(): Promise<LeadApiRow[]> {
  if (crmLeadsUsePostgres()) {
    return postgresListLeads();
  }
  return memoryListLeads();
}

export async function updateLeadStatus(id: string, status: LeadApiStatus): Promise<LeadApiRow> {
  let updated: LeadApiRow | undefined;
  if (crmLeadsUsePostgres()) {
    updated = await postgresUpdateLeadStatus(id, status);
  } else {
    updated = memoryUpdateLeadStatus(id, status);
  }
  if (!updated) {
    throw new CrmLeadsNotFoundError();
  }
  return updated;
}

export function __resetCrmLeadsStoreForTests(): void {
  memoryResetForTests();
}