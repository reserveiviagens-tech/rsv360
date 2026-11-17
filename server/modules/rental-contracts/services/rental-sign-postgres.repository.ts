import { createHash, randomBytes } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import { db } from '../../../../backend/src/db/drizzle';
import { crmRentalSignEvents, crmRentalSignRequests } from '../../../../backend/src/db/schema/crm-rental-sign';
import type { RentalSignRequestInput } from '../schema';
import type {
  SignRequestListItem,
  SignRequestPublicView,
  SignRequestRecord,
} from './rental-contract.types';

function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function eventId(): string {
  return `rsev_${Date.now()}_${randomBytes(4).toString('hex')}`;
}

async function appendEvent(signRequestId: string, eventType: string, metadata?: Record<string, unknown>) {
  await db.insert(crmRentalSignEvents).values({
    id: eventId(),
    signRequestId,
    eventType,
    metadata,
  });
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

export async function postgresCreateSignRequest(
  input: RentalSignRequestInput,
): Promise<SignRequestRecord> {
  const id = `rsign_${Date.now()}_${randomBytes(4).toString('hex')}`;
  const signingToken = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48);
  const contract = contractFromInput(input);

  await db.transaction(async (tx) => {
    await tx.insert(crmRentalSignRequests).values({
      id,
      unitId: input.unitId,
      status: 'pending',
      tokenHash: hashValue(signingToken),
      signerEmailHash: hashValue(input.signerEmail.toLowerCase()),
      signerName: input.signerName,
      signerCpfHash: hashValue(input.signerCpf),
      termMonths: input.termMonths,
      depositType: input.depositType,
      contractJson: contract,
      expiresAt,
    });
    await tx.insert(crmRentalSignEvents).values({
      id: eventId(),
      signRequestId: id,
      eventType: 'created',
      metadata: { unitId: input.unitId },
    });
  });

  return {
    id,
    unitId: input.unitId,
    status: 'pending',
    expiresAt: expiresAt.toISOString(),
    signingToken,
    signerName: input.signerName,
    termMonths: input.termMonths,
    depositType: input.depositType,
    createdAt: new Date().toISOString(),
  };
}

async function getRow(requestId: string) {
  const [row] = await db
    .select()
    .from(crmRentalSignRequests)
    .where(eq(crmRentalSignRequests.id, requestId))
    .limit(1);
  return row;
}

export async function postgresGetPublicSignView(
  requestId: string,
  token: string,
): Promise<SignRequestPublicView | null> {
  const row = await getRow(requestId);
  if (!row || row.tokenHash !== hashValue(token)) return null;
  const contract = row.contractJson;
  if (!contract) return null;
  await appendEvent(requestId, 'viewed');
  return {
    id: row.id,
    status: row.status as SignRequestPublicView['status'],
    expiresAt: row.expiresAt.toISOString(),
    signerName: row.signerName,
    unitName: contract.unitName,
    address: contract.address,
    termMonths: contract.termMonths,
    depositType: contract.depositType ?? row.depositType,
    monthlyRent: contract.monthlyRent,
  };
}

export async function postgresGetContractForToken(requestId: string, token: string) {
  const row = await getRow(requestId);
  if (!row || row.tokenHash !== hashValue(token)) return null;
  return row.contractJson ?? null;
}

export async function postgresCompleteSignRequest(
  requestId: string,
  token: string,
): Promise<SignRequestRecord | null> {
  const row = await getRow(requestId);
  if (!row) return null;
  if (row.status !== 'pending') return null;
  if (row.tokenHash !== hashValue(token)) return null;

  const expiresMs = row.expiresAt.getTime();
  if (expiresMs < Date.now()) {
    await db.transaction(async (tx) => {
      await tx
        .update(crmRentalSignRequests)
        .set({ status: 'expired', updatedAt: new Date() })
        .where(eq(crmRentalSignRequests.id, requestId));
      await tx.insert(crmRentalSignEvents).values({
        id: eventId(),
        signRequestId: requestId,
        eventType: 'expired',
      });
    });
    return {
      id: row.id,
      unitId: row.unitId,
      status: 'expired',
      expiresAt: row.expiresAt.toISOString(),
    };
  }

  const signedAt = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(crmRentalSignRequests)
      .set({ status: 'signed', signedAt, updatedAt: signedAt })
      .where(eq(crmRentalSignRequests.id, requestId));
    await tx.insert(crmRentalSignEvents).values({
      id: eventId(),
      signRequestId: requestId,
      eventType: 'signed',
      metadata: { signedAt: signedAt.toISOString() },
    });
  });

  return {
    id: row.id,
    unitId: row.unitId,
    status: 'signed',
    expiresAt: row.expiresAt.toISOString(),
    signedAt: signedAt.toISOString(),
  };
}

export async function postgresListSignRequestsByUnit(unitId: string): Promise<SignRequestListItem[]> {
  const rows = await db
    .select()
    .from(crmRentalSignRequests)
    .where(eq(crmRentalSignRequests.unitId, unitId))
    .orderBy(desc(crmRentalSignRequests.createdAt));

  return rows.map((row) => ({
    id: row.id,
    unitId: row.unitId,
    status: row.status as SignRequestListItem['status'],
    signerName: row.signerName,
    termMonths: row.termMonths,
    depositType: row.depositType,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    signedAt: row.signedAt?.toISOString(),
  }));
}