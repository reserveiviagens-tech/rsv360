/**
 * Tokens Lintel institucionais (Reservei Viagens) — espelho TS de lintel-tokens.css.
 * Hex sem `#` para alinhamento com lintel-theme.ts; cores via CSS vars em componentes.
 */

export const LINTEL_INSTITUTIONAL_HEX = {
  bgCanvas: 'F7F8FA',
  bgSurface: 'FFFFFF',
  bgSubtle: 'F1F3F6',
  brandNavy: '0B2239',
  brandGold: 'C59B27',
  brandGoldSoft: 'F6E7BE',
  statusPaid: '15803D',
  statusPaidBg: 'DCFCE7',
  statusPending: 'B45309',
  statusPendingBg: 'FEF3C7',
  statusDanger: 'B91C1C',
  statusDangerBg: 'FEE2E2',
} as const;

export const LINTEL_Z_INDEX = {
  stickyBottom: 40,
  modal: 50,
} as const;

export const LINTEL_INSTITUTIONAL_CSS = {
  bgCanvas: 'var(--lintel-bg-canvas)',
  bgSurface: 'var(--lintel-bg-surface)',
  bgSubtle: 'var(--lintel-bg-subtle)',
  brandNavy: 'var(--lintel-brand-navy)',
  brandGold: 'var(--lintel-brand-gold)',
  brandGoldSoft: 'var(--lintel-brand-gold-soft)',
} as const;

/** Progresso 0–100 para KPI Zeigarnik (pendências / tração). */
export function clampZeigarnikProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function lintelInstitutionalHex(token: keyof typeof LINTEL_INSTITUTIONAL_HEX): string {
  return `#${LINTEL_INSTITUTIONAL_HEX[token]}`;
}