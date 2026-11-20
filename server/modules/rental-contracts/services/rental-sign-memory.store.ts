import { createHash, randomBytes } from 'node:crypto';
import type { RentalSignRequestInput } from '../schema';
import type {
  SignRequestListItem,
  SignRequestPublicView,
  SignRequestRecord,
  StoredSignRequest,
} from './rental-contract.types';
import {
  effectiveSignStatus,
  isSignPastExpiry,
  maskSignerCpf,
} from './rental-sign-lifecycle.util';
import { maskClientIp } from './rental-sign-audit.util';

const signStore = new Map<string, StoredSignRequest>();
type MemoryAuditRow = {
  id: string;
  eventType: string;
  at: string;
  metadata?: Record<string, unknown>;
};

const eventsStore = new Map<string, MemoryAuditRow[]>();

function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function pushEvent(requestId: string, eventType: string, metadata?: Record<string, unknown>): void {
  const row: MemoryAuditRow = {
    id: `rsev_${Date.now()}_${randomBytes(3).toString('hex')}`,
    eventType,
    at: new Date().toISOString(),
    metadata,
  };
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
    signerCpfMasked: maskSignerCpf(input.signerCpf),
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

function memoryMarkExpiredIfNeeded(row: StoredSignRequest): void {
  if (row.status !== 'pending' || !isSignPastExpiry(row.expiresAt)) return;
  row.status = 'expired';
  pushEvent(row.id, 'expired');
}

export function memoryGetPublicSignView(requestId: string, token: string): SignRequestPublicView | null {
  const row = signStore.get(requestId);
  if (!row) return null;
  if (row.tokenHash !== hashValue(token)) return null;
  if (row.status === 'revoked') return null;
  if (row.status === 'pending') memoryMarkExpiredIfNeeded(row);
  if (row.status === 'expired') return null;
  if (row.status !== 'pending' && row.status !== 'signed') return null;
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
  if (row.status === 'revoked') return null;
  memoryMarkExpiredIfNeeded(row);
  if (row.status !== 'pending') return null;
  return row.contract;
}

export function memoryCompleteSignRequest(
  requestId: string,
  token: string,
  audit?: { clientIp?: string },
): SignRequestRecord | null {
  const row = signStore.get(requestId);
  if (!row) return null;
  if (row.status !== 'pending') return null;
  if (row.tokenHash !== hashValue(token)) return null;
  memoryMarkExpiredIfNeeded(row);
  if (row.status !== 'pending') return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    row.status = 'expired';
    pushEvent(requestId, 'expired');
    return { id: row.id, unitId: row.unitId, status: 'expired', expiresAt: row.expiresAt };
  }

  row.status = 'signed';
  row.signedAt = new Date().toISOString();
  const maskedIp = audit?.clientIp ? maskClientIp(audit.clientIp) : undefined;
  pushEvent(requestId, 'signed', {
    actor: 'locatario',
    ...(maskedIp ? { clientIp: maskedIp } : {}),
  });
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
      status: effectiveSignStatus(r.status, r.expiresAt),
      signerName: r.signerName ?? '—',
      signerCpfMasked: r.signerCpfMasked,
      termMonths: r.termMonths ?? 12,
      depositType: r.depositType ?? 'caucao',
      expiresAt: r.expiresAt,
      createdAt: r.createdAt ?? r.expiresAt,
      signedAt: r.signedAt,
    }));
}

export function memoryRevokeSignRequest(requestId: string, unitId: string): SignRequestRecord | null {
  const row = signStore.get(requestId);
  if (!row || row.unitId !== unitId) return null;
  if (row.status !== 'pending') return null;
  memoryMarkExpiredIfNeeded(row);
  if (row.status !== 'pending') return null;
  row.status = 'revoked';
  pushEvent(requestId, 'revoked');
  return {
    id: row.id,
    unitId: row.unitId,
    status: 'revoked',
    expiresAt: row.expiresAt,
  };
}

export function memoryRecordSignEvent(
  requestId: string,
  unitId: string,
  eventType: string,
  metadata?: Record<string, unknown>,
): boolean {
  const row = signStore.get(requestId);
  if (!row || row.unitId !== unitId) return false;
  pushEvent(requestId, eventType, metadata);
  return true;
}

export function memoryListSignRequestEvents(requestId: string, unitId: string) {
  const row = signStore.get(requestId);
  if (!row || row.unitId !== unitId) return null;
  const list = eventsStore.get(requestId) ?? [];
  return list
    .slice()
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((e) => ({
      id: e.id,
      eventType: e.eventType,
      occurredAt: e.at,
      metadata: e.metadata,
    }));
}

export function __resetSignStoreForTests(): void {
  signStore.clear();
  eventsStore.clear();
}