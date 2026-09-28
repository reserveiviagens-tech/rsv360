/**
 * C36-CL — Partner earning writer (booking_payment).
 *
 * Flow: Payment confirmed → Booking inventory → PEA commercial_owner @ T_pay
 *       → Commercial Terms @ T_pay → Snapshot → partner_earnings INSERT
 *
 * Does NOT write ledger or payout. Does NOT fall back to affiliate/ops rates.
 * Multi-PEA: 0=skip, 1=earning, >1=fail-closed (never first-row).
 * Idempotency: UNIQUE(source_type='booking_payment', source_id=payment.id).
 */

import {
  computeEarningCents,
  filterCommercialOwnersAt,
  resolveExclusiveCommercialOwner,
} from './partner-commercial-terms.util';
import {
  BOOKING_PAYMENT_SOURCE,
  EARNING_CONFIRMED_PAYMENT_STATUSES,
  type BookingPaymentEarningInput,
  type EarningPolicySnapshot,
  type EarningWriterResult,
  type PartnerEarningWriterPorts,
} from './partner-earning-writer.types';

function isUniqueSourceViolation(error: unknown): boolean {
  const e = error as {
    code?: string;
    constraint?: string;
    cause?: { code?: string; constraint?: string };
  };
  const code = e?.code ?? e?.cause?.code;
  const constraint = e?.constraint ?? e?.cause?.constraint ?? '';
  return (
    code === '23505' &&
    (constraint.includes('partner_earnings_source_unique') ||
      constraint.includes('source_unique') ||
      constraint.includes('source'))
  );
}

export class PartnerEarningWriterService {
  constructor(private readonly ports: PartnerEarningWriterPorts) {}

  /**
   * Create (or return existing) earning for a confirmed booking payment.
   * Safe to retry — unique source prevents double insert.
   */
  async createFromBookingPayment(
    input: BookingPaymentEarningInput,
  ): Promise<EarningWriterResult> {
    if (!EARNING_CONFIRMED_PAYMENT_STATUSES.has(input.paymentStatus)) {
      return { kind: 'skipped', reason: 'PAYMENT_NOT_CONFIRMED' };
    }

    if (!Number.isInteger(input.baseCents) || input.baseCents < 0) {
      return { kind: 'fail_closed', reason: 'INVALID_BASE_CENTS' };
    }

    const sourceId = String(input.paymentId);
    const existing = await this.ports.findExistingBySource(
      BOOKING_PAYMENT_SOURCE,
      sourceId,
    );
    if (existing) {
      return { kind: 'idempotent', earning: existing };
    }

    const inventory = await this.ports.resolveInventory({
      id: input.bookingId,
      bookingType: input.bookingType,
      itemId: input.itemId,
      metadata: input.bookingMetadata,
    });

    if (inventory.status !== 'resolved') {
      return {
        kind: 'skipped',
        reason: `INVENTORY_UNRESOLVED:${inventory.reasonCode ?? 'UNKNOWN'}`,
      };
    }

    const empreendimentoId = inventory.empreendimentoId ?? null;
    if (empreendimentoId == null) {
      return { kind: 'skipped', reason: 'NO_EMPREENDIMENTO' };
    }

    const peas = await this.ports.listPeasByEmpreendimentoId(empreendimentoId);
    const owners = filterCommercialOwnersAt(peas, input.tPay);
    const attribution = resolveExclusiveCommercialOwner(owners);

    if (attribution.kind === 'skip') {
      return { kind: 'skipped', reason: attribution.reason };
    }
    if (attribution.kind === 'ambiguous') {
      return {
        kind: 'fail_closed',
        reason: attribution.reason,
        detail: `count=${attribution.count}`,
      };
    }

    const termsResult = await this.ports.findEffectiveTermsAt(
      attribution.peaId,
      input.tPay,
    );
    if (termsResult.kind === 'none') {
      return { kind: 'skipped', reason: 'NO_EFFECTIVE_TERMS' };
    }
    if (termsResult.kind === 'ambiguous') {
      return {
        kind: 'fail_closed',
        reason: 'ATTR_AMBIGUOUS_TERMS',
        detail: `count=${termsResult.count}`,
      };
    }

    const { terms } = termsResult;
    const amountCents = computeEarningCents(input.baseCents, terms.rateBps);
    const currency = (input.currency ?? 'BRL').toUpperCase();

    const metadata: EarningPolicySnapshot = {
      policyVersion: 'C36-CC/CD',
      bookingId: input.bookingId,
      paymentId: sourceId,
      peaId: attribution.peaId,
      empreendimentoId,
      hotelId: inventory.hotelId ?? null,
      acomodacaoId: inventory.acomodacaoId ?? null,
      termsId: terms.termsId,
      termsVersion: terms.termsVersion,
      rateKind: terms.rateKind,
      rateBps: terms.rateBps,
      basis: terms.basis,
      baseCents: input.baseCents,
      currency,
      tPay: input.tPay.toISOString(),
      inventoryKind: inventory.inventoryKind,
    };

    try {
      const earning = await this.ports.insertEarning({
        partnerId: attribution.partnerId,
        sourceType: BOOKING_PAYMENT_SOURCE,
        sourceId,
        amountCents,
        currency,
        status: 'pending',
        metadata,
      });
      return { kind: 'created', earning };
    } catch (error) {
      if (isUniqueSourceViolation(error)) {
        const raced = await this.ports.findExistingBySource(
          BOOKING_PAYMENT_SOURCE,
          sourceId,
        );
        if (raced) return { kind: 'idempotent', earning: raced };
      }
      throw error;
    }
  }
}
