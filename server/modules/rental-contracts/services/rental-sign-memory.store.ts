import { createHash, randomBytes } from 'node:crypto';
import type { RentalSignRequestInput } from '../schema';
import type {
  SignRequestListItem,
  SignRequestPublicView,
  SignRequestRecord,
  StoredSignRequest,
} from './rental-contract.types';

const signStore = new Map<string, StoredSignRequest>();
const eventsStore = new Map<string, Array<{ id: string; eventType: string; at: string }>>();

function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function pushEvent(requestId: string, eventType: string): void {
  const row = { id: `rsev_${Date.now()}`, eventType, at: new Date().toISOString() };
  const list = eventsStore.get(requestId) ?? [];
  list.push(row);
  eventsStore.set(requestId, list);
}

function contractFromInput(input: RentalSignRequestInput) {
  return {
    unitId: input.unitId,
    unitName: input.unitName,
    address: input.address,
    tenantName: input.signerName,
    monthlyRent: input.monthlyRent,
    termMonths: input.termMonths,
    startDate: input.startDate,
    depositType: input.depositType,
  };
}

export function memoryCreateSignRequest(input: RentalSignRequestInput): SignRequestRecord {
  const id = `rsign_${Date.now()}_${randomBytes(4).toString('hex')}`;
  const signingToken = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48);
  const createdAt = new Date().toISOString();

  const record: StoredSignRequest = {
    id,
    unitId: input.unitId,
    status: 'pending',
    expiresAt: expiresAt.toISOString(),
    tokenHash: hashValue(signingToken),
    emailHash: hashValue(input.signerEmail.toLowerCase()),
    cpfHash: hashValue(input.signerCpf),
    signerName: input.signerName,
    termMonths: input.termMonths,
    depositType: input.depositType,
    createdAt,
    contract: contractFromInput(input),
    signingToken,
  };

  signStore.set(id, record);
  pushEvent(id, 'created');

  return {
    id: record.id,
    unitId: record.unitId,
    status: record.status,
    expiresAt: record.expiresAt,
    signingToken,
    signerName: record.signerName,
    termMonths: record.termMonths,
    depositType: record.depositType,
    createdAt,
  };
}

export function memoryGetPublicSignView(requestId: string, token: string): SignRequestPublicView | null {
  const row = signStore.get(requestId);
  if (!row) return null;
  if (row.tokenHash !== hashValue(token)) return null;
  pushEvent(requestId, 'viewed');
  return {
    id: row.id,
    status: row.status,
    expiresAt: row.expiresAt,
    signerName: row.signerName ?? row.contract.tenantName,
    unitName: row.contract.unitName,
    address: row.contract.address,
    termMonths: row.contract.termMonths,
    depositType: row.contract.depositType ?? 'caucao',
    monthlyRent: row.contract.monthlyRent,
  };
}

export function memoryGetContractForToken(
  requestId: string,
  token: string,
): StoredSignRequest['contract'] | null {
  const row = signStore.get(requestId);
  if (!row || row.tokenHash !== hashValue(token)) return null;
  return row.contract;
}

export function memoryCompleteSignRequest(requestId: string, token: string): SignRequestRecord | null {
  const row = signStore.get(requestId);
  if (!row) return null;
  if (row.status !== 'pending') return null;
  if (row.tokenHash !== hashValue(token)) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    row.status = 'expired';
    pushEvent(requestId, 'expired');
    return { id: row.id, unitId: row.unitId, status: 'expired', expiresAt: row.expiresAt };
  }

  row.status = 'signed';
  row.signedAt = new Date().toISOString();
  pushEvent(requestId, 'signed');
  return {
    id: row.id,
    unitId: row.unitId,
    status: 'signed',
    expiresAt: row.expiresAt,
    signedAt: row.signedAt,
  };
}

export function memoryListSignRequestsByUnit(unitId: string): SignRequestListItem[] {
  return Array.from(signStore.values())
    .filter((r) => r.unitId === unitId)
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .map((r) => ({
      id: r.id,
      unitId: r.unitId,
      status: r.status,
      signerName: r.signerName ?? '—',
      termMonths: r.termMonths ?? 12,
      depositType: r.depositType ?? 'caucao',
      expiresAt: r.expiresAt,
      createdAt: r.createdAt ?? r.expiresAt,
      signedAt: r.signedAt,
    }));
}

export function __resetSignStoreForTests(): void {
  signStore.clear();
  eventsStore.clear();
}