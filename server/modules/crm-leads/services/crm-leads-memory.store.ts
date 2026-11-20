import { apiStatusToDb, memoryRecordToRow, type MemoryLeadRecord } from '../crm-leads-mapper';
import type { LeadApiRow, LeadApiStatus } from '../schema';

const now = new Date();
const ago = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();

export const SEED_LEADS: MemoryLeadRecord[] = [
  {
    id: 'l1',
    clientName: 'Mariana Costa',
    clientEmail: 'mariana.costa@email.com',
    clientPhone: '+55 11 98888-1234',
    source: 'Instagram',
    status: 'novo',
    notes: 'Interesse em apartamento 3 dorms na zona sul.',
    createdAt: ago(2),
    updatedAt: ago(2),
  },
  {
    id: 'l2',
    clientName: 'Rafael Meneses',
    clientEmail: 'rafael.m@gmail.com',
    clientPhone: '+55 21 97777-4321',
    source: 'Indicação',
    status: 'contatado',
    notes: null,
    createdAt: ago(8),
    updatedAt: ago(5),
  },
  {
    id: 'l3',
    clientName: 'Helena Dupont',
    clientEmail: 'helena.dupont@corp.br',
    clientPhone: '+55 48 96666-7890',
    source: 'Google Ads',
    status: 'convertido',
    notes: 'Já vinculado a deal em negociação.',
    createdAt: ago(48),
    updatedAt: ago(12),
    dealId: 'deal_demo_helena',
  },
];

let store: MemoryLeadRecord[] = [...SEED_LEADS];

export function memoryListLeads(): LeadApiRow[] {
  return store.map((rec) => memoryRecordToRow(rec));
}

export function memoryUpdateLeadStatus(id: string, status: LeadApiStatus): LeadApiRow | undefined {
  const idx = store.findIndex((l) => l.id === id);
  if (idx < 0) return undefined;
  const dbStatus = apiStatusToDb(status);
  store[idx] = {
    ...store[idx],
    status: dbStatus,
    updatedAt: new Date().toISOString(),
  };
  return memoryRecordToRow(store[idx]);
}

export function memoryResetForTests(): void {
  store = SEED_LEADS.map((l) => ({ ...l }));
}