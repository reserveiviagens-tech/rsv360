/**
 * C36-DE-08 — Reconciliation POLICY (pure, no I/O, no DB, no network).
 *
 * Time/attempt rules live here so the service stays a thin orchestrator and the rules are
 * testable without clocks or databases.
 *
 * Anti-false-timeout: an `executing` row is only eligible when we can PROVE it has been
 * sitting there longer than the TTL **and** it is not inside a live lease. A missing or
 * unparsable timestamp is treated as NOT expired — never as expired — because expiring on
 * missing evidence is exactly what would let a healthy in-flight execution be stolen.
 */

export const RECONCILIATION_DEFAULTS = Object.freeze({
  ttlMs: 5 * 60 * 1000,
  graceMs: 30 * 1000,
  maxAttempts: 5,
  backoffBaseMs: 15 * 1000,
  backoffMaxMs: 15 * 60 * 1000,
  leaseMs: 60 * 1000,
} as const);

export const RECONCILIATION_METADATA_KEY = 'reconciliation';

export type ReconciliationState = {
  attempts: number;
  lastAttemptAt: string | null;
  nextEligibleAt: string | null;
  leaseOwnerId: string | null;
  leaseExpiresAt: string | null;
  exhausted: boolean;
};

const EMPTY_STATE: ReconciliationState = Object.freeze({
  attempts: 0,
  lastAttemptAt: null,
  nextEligibleAt: null,
  leaseOwnerId: null,
  leaseExpiresAt: null,
  exhausted: false,
});

function parseIsoOrNull(value: unknown): number | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

/** Reads the reconciliation block defensively. Unknown shapes degrade to the empty state. */
export function readReconciliationState(metadata: unknown): ReconciliationState {
  if (metadata === null || typeof metadata !== 'object') return { ...EMPTY_STATE };
  const block = (metadata as Record<string, unknown>)[RECONCILIATION_METADATA_KEY];
  if (block === null || typeof block !== 'object') return { ...EMPTY_STATE };
  const b = block as Record<string, unknown>;
  return {
    attempts: isPositiveInt(b.attempts) ? b.attempts : 0,
    lastAttemptAt: typeof b.lastAttemptAt === 'string' ? b.lastAttemptAt : null,
    nextEligibleAt: typeof b.nextEligibleAt === 'string' ? b.nextEligibleAt : null,
    leaseOwnerId: typeof b.leaseOwnerId === 'string' && b.leaseOwnerId.length > 0 ? b.leaseOwnerId : null,
    leaseExpiresAt: typeof b.leaseExpiresAt === 'string' ? b.leaseExpiresAt : null,
    exhausted: b.exhausted === true,
  };
}

/** Serialisable patch merged into `metadata['reconciliation']`. */
export type ReconciliationStatePatch = Partial<ReconciliationState>;

function toIso(ms: number): string {
  return new Date(ms).toISOString();
}

/**
 * Exponential backoff with a hard cap. `attempt` is 1-based: attempt 1 => base.
 * Never returns a negative or NaN delay.
 */
export function computeBackoffMs(
  attempt: number,
  options: { baseMs?: number; maxMs?: number } = {},
): number {
  const base = isPositiveInt(options.baseMs) ? options.baseMs : RECONCILIATION_DEFAULTS.backoffBaseMs;
  const max = isPositiveInt(options.maxMs) ? options.maxMs : RECONCILIATION_DEFAULTS.backoffMaxMs;
  const n = isPositiveInt(attempt) ? attempt : 1;
  const raw = base * Math.pow(2, Math.min(n - 1, 16));
  return Math.min(raw, max);
}

/** Last liveness evidence for the row: `updatedAt`, else execution timestamp, else none. */
export function readLivenessAt(row: { updatedAt?: unknown; metadata?: unknown }): number | null {
  const updated = row.updatedAt instanceof Date
    ? row.updatedAt.getTime()
    : parseIsoOrNull(row.updatedAt);
  if (updated !== null) return updated;
  if (row.metadata && typeof row.metadata === 'object') {
    const exec = (row.metadata as Record<string, unknown>)['execution'];
    if (exec && typeof exec === 'object') {
      const e = exec as Record<string, unknown>;
      const started = parseIsoOrNull(e.executedAt ?? e.startedAt);
      if (started !== null) return started;
    }
  }
  return null;
}

export type ExpiryVerdict = {
  expired: boolean;
  reason: 'expired' | 'not_expired' | 'no_evidence' | 'lease_held';
  ageMs: number | null;
};

/**
 * Decides whether an `executing` row may be reconciled.
 * Order matters: a live lease always wins; missing evidence is never "expired".
 */
export function evaluateExecutingExpiry(
  row: { updatedAt?: unknown; metadata?: unknown },
  now: Date,
  options: { ttlMs?: number; graceMs?: number } = {},
): ExpiryVerdict {
  const ttl = isPositiveInt(options.ttlMs) ? options.ttlMs : RECONCILIATION_DEFAULTS.ttlMs;
  const grace = Number.isSafeInteger(options.graceMs) && (options.graceMs ?? 0) >= 0
    ? (options.graceMs as number)
    : RECONCILIATION_DEFAULTS.graceMs;
  const nowMs = now.getTime();

  const state = readReconciliationState(row.metadata);
  const leaseUntil = parseIsoOrNull(state.leaseExpiresAt);
  if (leaseUntil !== null && leaseUntil > nowMs) {
    return { expired: false, reason: 'lease_held', ageMs: null };
  }

  const liveness = readLivenessAt(row);
  if (liveness === null) return { expired: false, reason: 'no_evidence', ageMs: null };

  const ageMs = nowMs - liveness;
  if (ageMs < ttl + grace) return { expired: false, reason: 'not_expired', ageMs };
  return { expired: true, reason: 'expired', ageMs };
}

/** Attempts exhausted => give up (the row stays `executing`, nothing is retried). */
export function isAttemptsExhausted(
  metadata: unknown,
  maxAttempts: number = RECONCILIATION_DEFAULTS.maxAttempts,
): boolean {
  const max = isPositiveInt(maxAttempts) ? maxAttempts : RECONCILIATION_DEFAULTS.maxAttempts;
  const state = readReconciliationState(metadata);
  return state.exhausted || state.attempts >= max;
}

/** True when the backoff window has not elapsed yet. */
export function isInBackoff(metadata: unknown, now: Date): boolean {
  const state = readReconciliationState(metadata);
  const next = parseIsoOrNull(state.nextEligibleAt);
  return next !== null && next > now.getTime();
}

/** NEXT attempt bookkeeping (attempt incremented + backoff scheduled). Persisted via CAS. */
export function nextAttemptState(
  metadata: unknown,
  now: Date,
  options: { maxAttempts?: number; baseMs?: number; maxMs?: number } = {},
): ReconciliationStatePatch {
  const max = isPositiveInt(options.maxAttempts) ? options.maxAttempts : RECONCILIATION_DEFAULTS.maxAttempts;
  const state = readReconciliationState(metadata);
  const attempts = state.attempts + 1;
  const exhausted = attempts >= max;
  return {
    attempts,
    lastAttemptAt: toIso(now.getTime()),
    nextEligibleAt: exhausted ? null : toIso(now.getTime() + computeBackoffMs(attempts, options)),
    leaseOwnerId: null,
    leaseExpiresAt: null,
    exhausted,
  };
}

/** Lease claim bookkeeping (single writer for `leaseMs`). */
export function leaseClaimState(ownerId: string, now: Date, leaseMs?: number): ReconciliationStatePatch {
  const span = isPositiveInt(leaseMs) ? leaseMs : RECONCILIATION_DEFAULTS.leaseMs;
  return {
    leaseOwnerId: ownerId,
    leaseExpiresAt: toIso(now.getTime() + span),
    exhausted: false,
  };
}

/** Merges the reconciliation patch into an existing metadata object (never mutates input). */
export function withReconciliationMetadata(
  metadata: unknown,
  patch: ReconciliationStatePatch,
  now: Date = new Date(),
): Record<string, unknown> {
  const base: Record<string, unknown> =
    metadata !== null && typeof metadata === 'object' ? { ...(metadata as Record<string, unknown>) } : {};
  const prior = readReconciliationState(base);
  base[RECONCILIATION_METADATA_KEY] = {
    ...prior,
    ...patch,
    updatedAt: now.toISOString(),
  };
  return base;
}
