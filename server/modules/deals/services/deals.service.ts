import type { CreateDealInput, DealRecord, DealStage } from '../schema';
import {
  memoryCreateDeal,
  memoryListDeals,
  memoryResetForTests,
  memoryUpdateDealStage,
} from './deals-memory.store';
import {
  postgresCreateDeal,
  postgresGetDeal,
  postgresListDeals,
  postgresUpdateDealStage,
} from './deals-postgres.repository';

const STAFF_ROLES = new Set(['admin', 'manager']);

const PARCEIRO_ROLES = new Set(['anfitriao', 'corretor', 'agente', 'promotor']);

export function dealsUsePostgres(): boolean {
  if (process.env.JEST_WORKER_ID) return false;
  const mode = process.env.DEALS_PERSISTENCE ?? 'postgres';
  if (mode === 'memory') return false;
  return mode === 'postgres' && Boolean(process.env.DATABASE_URL);
}

export function listDeals(): DealRecord[] {
  if (!dealsUsePostgres()) {
    return memoryListDeals();
  }
  throw new Error('Use listDealsAsync when postgres persistence is enabled');
}

export async function listDealsAsync(): Promise<DealRecord[]> {
  if (dealsUsePostgres()) {
    return postgresListDeals();
  }
  return memoryListDeals();
}

export function canMutateDeal(_userId: number, role: string, _deal: DealRecord): boolean {
  if (STAFF_ROLES.has(role)) return true;
  return PARCEIRO_ROLES.has(role);
}

export async function createDeal(
  userId: number,
  role: string,
  input: CreateDealInput,
): Promise<DealRecord> {
  if (!STAFF_ROLES.has(role) && !PARCEIRO_ROLES.has(role)) {
    throw new DealsForbiddenError('Sem permissão para criar negócio');
  }
  if (dealsUsePostgres()) {
    return postgresCreateDeal(userId, input);
  }
  return memoryCreateDeal(input, userId);
}

export async function updateDealStage(
  userId: number,
  role: string,
  dealId: string,
  stage: DealStage,
): Promise<DealRecord> {
  if (dealsUsePostgres()) {
    const existing = await postgresGetDeal(dealId);
    if (!existing) {
      throw new DealsNotFoundError('Negócio não encontrado');
    }
    if (!canMutateDeal(userId, role, existing)) {
      throw new DealsForbiddenError('Sem permissão para alterar este negócio');
    }
    try {
      return await postgresUpdateDealStage(userId, dealId, stage);
    } catch (err) {
      if (err instanceof Error && err.message === 'NOT_FOUND') {
        throw new DealsNotFoundError('Negócio não encontrado');
      }
      throw err;
    }
  }

  const deals = memoryListDeals();
  const deal = deals.find((d) => d.id === dealId);
  if (!deal) {
    throw new DealsNotFoundError('Negócio não encontrado');
  }
  if (!canMutateDeal(userId, role, deal)) {
    throw new DealsForbiddenError('Sem permissão para alterar este negócio');
  }
  try {
    return memoryUpdateDealStage(dealId, stage);
  } catch {
    throw new DealsNotFoundError('Negócio não encontrado');
  }
}

export class DealsNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DealsNotFoundError';
  }
}

export class DealsForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DealsForbiddenError';
  }
}

/** Test-only reset (memory store). */
export function __resetDealsStoreForTests(): void {
  memoryResetForTests();
}