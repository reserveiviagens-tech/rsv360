import { createHash, randomBytes } from 'node:crypto';
import type { RentalSignRequestInput } from '../schema';
import type { SignRequestRecord } from './rental-contract.types';

type Stored = SignRequestRecord & { tokenHash: string; emailHash: string };

const signStore = new Map<string, Stored>();

function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function memoryCreateSignRequest(input: RentalSignRequestInput): SignRequestRecord {
  const id = `rsign_${Date.now()}_${randomBytes(4).toString('hex')}`;
  const signingToken = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48);

  const record: Stored = {
    id,
    unitId: input.unitId,
    status: 'pending',
    expiresAt: expiresAt.toISOString(),
    tokenHash: hashValue(signingToken),
    emailHash: hashValue(input.signerEmail.toLowerCase()),
    signingToken,
  };

  signStore.set(id, record);

  return {
    id: record.id,
    unitId: record.unitId,
    status: record.status,
    expiresAt: record.expiresAt,
    signingToken,
  };
}

export function memoryCompleteSignRequest(requestId: string, token: string): SignRequestRecord | null {
  const row = signStore.get(requestId);
  if (!row) return null;
  if (row.status !== 'pending') return null;
  if (row.tokenHash !== hashValue(token)) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    row.status = 'expired';
    return { id: row.id, unitId: row.unitId, status: 'expired', expiresAt: row.expiresAt };
  }

  row.status = 'signed';
  return { id: row.id, unitId: row.unitId, status: 'signed', expiresAt: row.expiresAt };
}

export function __resetSignStoreForTests(): void {
  signStore.clear();
}