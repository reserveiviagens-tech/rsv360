/**
 * NFSe draft helpers for host fiscal MVP (no municipal authorization).
 * Drafts live in metadata.nfseDrafts[] — never call city/certificate APIs here.
 */

import { randomUUID } from 'crypto';
import {
  computeImpostoEstimado,
  extractImpostosFromMetadata,
  roundMoney,
} from './listing-impostos-receita-export.util';
import type { ListingImpostos } from './listing-impostos.util';

export const NFSE_DRAFTS_MAX = 24;

export type NfseDraftStatus = 'nfse_pending' | 'nfse_cancelled';

export type NfseDraft = {
  id: string;
  mes: string;
  receita: number;
  aliquotaPct: number | null;
  isento: boolean;
  impostoEstimado: number | null;
  status: NfseDraftStatus;
  criadoEm: string;
};

export type BuildNfseDraftInput = {
  mes: string;
  receita: number;
  impostos: ListingImpostos | undefined;
  criadoEm?: string;
  id?: string;
};

const YM_RE = /^\d{4}-\d{2}$/;

export function isValidNfseMes(mes: string): boolean {
  if (!YM_RE.test(mes)) return false;
  const month = Number(mes.slice(5, 7));
  return month >= 1 && month <= 12;
}

export function currentNfseMes(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function monthBoundsForNfse(ym: string): { de: string; ate: string } {
  const [y, m] = ym.split('-').map(Number);
  const de = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-01`;
  const last = new Date(y, m, 0).getDate();
  const ate = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  return { de, ate };
}

export function buildNfseDraft(input: BuildNfseDraftInput): NfseDraft {
  const receita = roundMoney(Number.isFinite(input.receita) ? Math.max(0, input.receita) : 0);
  const isento = input.impostos?.isento === true;
  const aliquotaRaw = input.impostos?.aliquotaPct;
  const aliquotaPct =
    !isento && typeof aliquotaRaw === 'number' && Number.isFinite(aliquotaRaw)
      ? aliquotaRaw
      : null;
  const impostoEstimado = computeImpostoEstimado(receita, input.impostos);

  return {
    id: input.id ?? randomUUID(),
    mes: input.mes,
    receita,
    aliquotaPct,
    isento,
    impostoEstimado,
    status: 'nfse_pending',
    criadoEm: input.criadoEm ?? new Date().toISOString(),
  };
}

function isDraftShape(raw: unknown): raw is NfseDraft {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const d = raw as Record<string, unknown>;
  return (
    typeof d.id === 'string' &&
    typeof d.mes === 'string' &&
    typeof d.receita === 'number' &&
    (d.aliquotaPct === null || typeof d.aliquotaPct === 'number') &&
    typeof d.isento === 'boolean' &&
    (d.impostoEstimado === null || typeof d.impostoEstimado === 'number') &&
    (d.status === 'nfse_pending' || d.status === 'nfse_cancelled') &&
    typeof d.criadoEm === 'string'
  );
}

/** Read existing drafts from listing metadata (invalid entries dropped). */
export function readNfseDraftsFromMetadata(metadata: unknown): NfseDraft[] {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return [];
  const raw = (metadata as Record<string, unknown>).nfseDrafts;
  if (!Array.isArray(raw)) return [];
  return raw.filter(isDraftShape).slice(0, NFSE_DRAFTS_MAX);
}

/**
 * Prepend a draft; replace same-mes pending drafts; keep at most NFSE_DRAFTS_MAX (newest first).
 */
export function appendNfseDraft(existing: NfseDraft[], draft: NfseDraft): NfseDraft[] {
  const withoutSameMesPending = existing.filter(
    (d) => !(d.mes === draft.mes && d.status === 'nfse_pending'),
  );
  return [draft, ...withoutSameMesPending].slice(0, NFSE_DRAFTS_MAX);
}

/**
 * Pure merge helper for tests / service: build draft + append into metadata copy.
 * Throws if drafts would exceed max without room after replace (should not happen with appendNfseDraft).
 */
export function mergeNfseDraftIntoMetadata(
  metadata: unknown,
  input: BuildNfseDraftInput,
): { metadata: Record<string, unknown>; draft: NfseDraft } {
  const base =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  const existing = readNfseDraftsFromMetadata(base);
  const draft = buildNfseDraft(input);
  const next = appendNfseDraft(existing, draft);
  if (next.length > NFSE_DRAFTS_MAX) {
    throw new Error('nfse_drafts_max');
  }
  base.nfseDrafts = next;
  return { metadata: base, draft };
}

export function impostosForNfseFromMetadata(metadata: unknown): ListingImpostos | undefined {
  return extractImpostosFromMetadata(metadata);
}
