/**
 * C36-DE-06 — Drizzle ports for the RefundRequest execution slice.
 *
 * Runtime-only persistence adapter. Every write is a compare-and-set guarded by
 * (status, request_version) inside a transaction, so two concurrent executors
 * can never both win — the loser observes a `conflict` with the current row.
 *
 * Deliberately separate from `refund-request-execution.service.ts`: the domain
 * stays free of any database import and is unit-tested against in-memory ports.
 *
 * No migration is required: `refund_requests` and its `metadata` jsonb column
 * already exist (0062 / 0063, published). This file only reads and writes.
 */

import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../../../src/db/drizzle';
import { refundRequests } from '../../../../src/db/schema/payments';
import type {
  ExecutionMutationInput,
  ExecutionMutationResult,
  RefundExecutionPorts,
} from './refund-request-execution.service';
import type { RefundRequestRow } from './refund-request.service';

function mapRow(row: typeof refundRequests.$inferSelect): RefundRequestRow {
  return {
    id: row.id,
    paymentId: row.paymentId,
    bookingId: row.bookingId,
    amount: String(row.amount),
    currency: row.currency,
    reason: row.reason,
    requestedBy: row.requestedBy,
    status: row.status,
    requestVersion: row.requestVersion,
    idempotencyKey: row.idempotencyKey,
    metadata: row.metadata,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    decidedBy: row.decidedBy,
    decidedAt: row.decidedAt,
    decisionReason: row.decisionReason,
  };
}

/** The transaction handle accepted by every CAS writer below. */
type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Shared CAS writer: 0 updated rows ⇒ reload and report the conflict. */
async function mutate(
  tx: DbTx,
  input: ExecutionMutationInput & { expectedStatus: string; next?: string },
): Promise<ExecutionMutationResult> {
  const [updated] = await tx
    .update(refundRequests)
    .set({
      ...(input.next ? { status: input.next } : {}),
      requestVersion: sql`${refundRequests.requestVersion} + 1`,
      metadata: input.metadata,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(refundRequests.id, input.requestId),
        eq(refundRequests.status, input.expectedStatus),
        eq(refundRequests.requestVersion, input.expectedVersion),
      ),
    )
    .returning();

  if (updated) {
    return { kind: 'updated', request: mapRow(updated) };
  }

  const [current] = await tx
    .select()
    .from(refundRequests)
    .where(eq(refundRequests.id, input.requestId))
    .limit(1);
  return { kind: 'conflict', current: current ? mapRow(current) : null };
}

export function createDrizzleRefundExecutionPorts(): RefundExecutionPorts {
  return {
    async findById(id) {
      const [row] = await db
        .select()
        .from(refundRequests)
        .where(eq(refundRequests.id, id))
        .limit(1);
      return row ? mapRow(row) : null;
    },

    async claim(input) {
      return db.transaction((tx) =>
        mutate(tx, { ...input, expectedStatus: 'approved', next: 'executing' }),
      );
    },

    async recordReceipt(input) {
      return db.transaction((tx) =>
        mutate(tx, { ...input, expectedStatus: 'executing' }),
      );
    },

    async finalize(input) {
      return db.transaction((tx) =>
        mutate(tx, {
          ...input,
          expectedStatus: 'executing',
          next: input.next,
        }),
      );
    },
  };
}
