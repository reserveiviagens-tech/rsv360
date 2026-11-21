export type RentalSignWebhookMetricKey =
  | 'delivered'
  | 'failed'
  | 'skipped_not_signed'
  | 'skipped_webhook_disabled'
  | 'skipped_idempotent';

const counts: Record<RentalSignWebhookMetricKey, number> = {
  delivered: 0,
  failed: 0,
  skipped_not_signed: 0,
  skipped_webhook_disabled: 0,
  skipped_idempotent: 0,
};

export function recordRentalSignWebhookMetric(key: RentalSignWebhookMetricKey): void {
  counts[key] += 1;
}

export function getRentalSignWebhookMetrics(): Record<RentalSignWebhookMetricKey, number> {
  return { ...counts };
}

/** Test-only */
export function __resetRentalSignWebhookMetricsForTests(): void {
  for (const k of Object.keys(counts) as RentalSignWebhookMetricKey[]) {
    counts[k] = 0;
  }
}