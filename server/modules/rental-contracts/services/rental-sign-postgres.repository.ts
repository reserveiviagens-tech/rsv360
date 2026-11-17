import { createHash, randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../../../../backend/src/db/drizzle';
import { crmRentalSignRequests } from '../../../../backend/src/db/schema/crm-rental-sign';
import type { RentalSignRequestInput } from '../schema';
import type { SignRequestRecord } from './rental-contract.types';

function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export async function postgresCreateSignRequest(
  input: RentalSignRequestInput,
): Promise<SignRequestRecord> {
  const id = `rsign_${Date.now()}_${randomBytes(4).toString('hex')}`;
  const signingToken = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48);

  await db.insert(crmRentalSignRequests).values({
    id,
    unitId: input.unitId,
    status: 'pending',
    tokenHash: hashValue(signingToken),
    signerEmailHash: hashValue(input.signerEmail.toLowerCase()),
    signerName: input.signerName,
    expiresAt,
  });

  return {
    id,
    unitId: input.unitId,
    status: 'pending',
    expiresAt: expiresAt.toISOString(),
    signingToken,
  };
}

export async function postgresCompleteSignRequest(
  requestId: string,
  token: string,
): Promise<SignRequestRecord | null> {
  const [row] = await db
    .select()
    .from(crmRentalSignRequests)
    .where(eq(crmRentalSignRequests.id, requestId))
    .limit(1);

  if (!row) return null;
  if (row.status !== 'pending') return null;
  if (row.tokenHash !== hashValue(token)) return null;

  const expiresMs = row.expiresAt.getTime();
  if (expiresMs < Date.now()) {
    await db
      .update(crmRentalSignRequests)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(eq(crmRentalSignRequests.id, requestId));
    return {
      id: row.id,
      unitId: row.unitId,
      status: 'expired',
      expiresAt: row.expiresAt.toISOString(),
    };
  }

  await db
    .update(crmRentalSignRequests)
    .set({ status: 'signed', updatedAt: new Date() })
    .where(eq(crmRentalSignRequests.id, requestId));

  return {
    id: row.id,
    unitId: row.unitId,
    status: 'signed',
    expiresAt: row.expiresAt.toISOString(),
  };
}