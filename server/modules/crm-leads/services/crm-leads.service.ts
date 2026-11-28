import type { CreateLeadInput, LeadApiRow, LeadApiStatus } from '../schema';
import {
  memoryCreateLead,
  memoryListLeads,
  memoryResetForTests,
  memoryUpdateLeadStatus,
} from './crm-leads-memory.store';
import {
  postgresBulkCreateLeads,
  postgresCreateLead,
  postgresListLeads,
  postgresUpdateLeadStatus,
} from './crm-leads-postgres.repository';

export type BulkCreateLeadsResult = {
  items: LeadApiRow[];
  idempotentReplay: boolean;
};

const bulkIdempotencyCache = new Map<string, LeadApiRow[]>();

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

export async function createLead(userId: number, input: CreateLeadInput): Promise<LeadApiRow> {
  if (crmLeadsUsePostgres()) {
    return postgresCreateLead(userId, input);
  }
  return memoryCreateLead(input);
}

export async function bulkCreateLeads(
  userId: number,
  items: CreateLeadInput[],
  idempotencyKey?: string,
): Promise<BulkCreateLeadsResult> {
  if (idempotencyKey) {
    const cached = bulkIdempotencyCache.get(idempotencyKey);
    if (cached) {
      return { items: cached, idempotentReplay: true };
    }
  }

  let created: LeadApiRow[];
  if (crmLeadsUsePostgres()) {
    created = await postgresBulkCreateLeads(userId, items);
  } else {
    created = items.map((input) => memoryCreateLead(input));
  }

  if (idempotencyKey) {
    bulkIdempotencyCache.set(idempotencyKey, created);
  }

  return { items: created, idempotentReplay: false };
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
  bulkIdempotencyCache.clear();
}