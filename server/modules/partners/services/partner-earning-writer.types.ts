/**
 * C36-CL — Partner earning writer contracts.
 * LEDGER / PAYOUT remain out of scope for this gate.
 */

export const BOOKING_PAYMENT_SOURCE = 'booking_payment' as const;

/** Payment statuses that authorize an earning (money confirmed). */
export const EARNING_CONFIRMED_PAYMENT_STATUSES = new Set([
  'approved',
]);

export type PeaCommercialCandidate = {
  peaId: string;
  partnerId: string;
  associationRole: string;
  status: string;
  effectiveFrom: Date | string | null;
  effectiveTo: Date | string | null;
};

export type EffectiveTermsSnapshot = {
  termsId: string;
  termsVersion: number;
  rateBps: number;
  rateKind: string;
  basis: string;
};

export type BookingPaymentEarningInput = {
  paymentId: string;
  paymentStatus: string;
  bookingId: number;
  /** Already rounded booking total in cents (basis=booking_total). */
  baseCents: number;
  currency?: string;
  /** Payment confirmed timestamp (T_pay). */
  tPay: Date;
  bookingType: string;
  itemId: number;
  bookingMetadata?: unknown;
};

export type EarningPolicySnapshot = {
  policyVersion: 'C36-CC/CD';
  bookingId: number;
  paymentId: string;
  peaId: string;
  empreendimentoId: number | null;
  hotelId: string | null;
  acomodacaoId: number | null;
  termsId: string;
  termsVersion: number;
  rateKind: string;
  rateBps: number;
  basis: string;
  baseCents: number;
  currency: string;
  tPay: string;
  inventoryKind: string;
};

export type PartnerEarningRow = {
  id: string;
  partnerId: string;
  sourceType: string;
  sourceId: string;
  amountCents: number;
  currency: string;
  status: string;
  metadata: EarningPolicySnapshot | Record<string, unknown> | null;
};

export type EarningWriterResult =
  | { kind: 'skipped'; reason: string }
  | { kind: 'fail_closed'; reason: string; detail?: string }
  | { kind: 'created'; earning: PartnerEarningRow }
  | { kind: 'idempotent'; earning: PartnerEarningRow };

export type InsertEarningParams = {
  partnerId: string;
  sourceType: typeof BOOKING_PAYMENT_SOURCE;
  sourceId: string;
  amountCents: number;
  currency: string;
  status: 'pending';
  metadata: EarningPolicySnapshot;
};

/**
 * Injectable ports — unit tests supply memory implementations; production uses Drizzle.
 * No ledger / payout methods here.
 */
export type PartnerEarningWriterPorts = {
  findExistingBySource(
    sourceType: string,
    sourceId: string,
  ): Promise<PartnerEarningRow | null>;

  /**
   * Resolve booking → inventory (+ partners optional).
   * Writer always requests inventory resolution; PEA commercial filter is applied separately.
   */
  resolveInventory(input: {
    bookingType: string;
    itemId: number;
    metadata?: unknown;
    id?: number;
  }): Promise<{
    status: 'resolved' | 'unresolved';
    inventoryKind: string;
    empreendimentoId?: number | null;
    hotelId?: string | null;
    acomodacaoId?: number | null;
    reasonCode?: string;
  }>;

  /** PEAs for empreendimento (any role/status); writer filters commercial_owner @ T_pay. */
  listPeasByEmpreendimentoId(
    empreendimentoId: number,
  ): Promise<PeaCommercialCandidate[]>;

  /**
   * Active commercial terms effective at T_pay for PEA.
   * Return null if none; throw / return ambiguous marker if >1 (fail-closed).
   */
  findEffectiveTermsAt(
    peaId: string,
    tPay: Date,
  ): Promise<
    | { kind: 'ok'; terms: EffectiveTermsSnapshot }
    | { kind: 'none' }
    | { kind: 'ambiguous'; count: number }
  >;

  insertEarning(params: InsertEarningParams): Promise<PartnerEarningRow>;
};
