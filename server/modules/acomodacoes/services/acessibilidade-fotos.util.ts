/**
 * Accessibility photo review lifecycle (host metadata).
 * Legacy string URLs are treated as pendente.
 */

export type AcessibilidadeFotoStatus =
  | 'pendente'
  | 'em_revisao'
  | 'publicado'
  | 'rejeitado';

export type AcessibilidadeFoto = {
  url: string;
  status: AcessibilidadeFotoStatus;
  enviadoEm?: string;
  publicadoEm?: string;
};

export type AcessibilidadeItemPersisted = {
  id: string;
  possui: boolean | null;
  fotos: AcessibilidadeFoto[];
};

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export function normalizeAcessibilidadeFoto(raw: unknown): AcessibilidadeFoto | null {
  if (typeof raw === 'string' && raw.trim()) {
    return { url: raw.trim(), status: 'pendente' };
  }
  const o = asRecord(raw);
  const url = typeof o.url === 'string' ? o.url.trim() : '';
  if (!url) return null;
  const statusRaw = String(o.status ?? 'pendente');
  const status: AcessibilidadeFotoStatus =
    statusRaw === 'em_revisao' ||
    statusRaw === 'publicado' ||
    statusRaw === 'rejeitado' ||
    statusRaw === 'pendente'
      ? statusRaw
      : 'pendente';
  return {
    url,
    status,
    ...(typeof o.enviadoEm === 'string' ? { enviadoEm: o.enviadoEm } : {}),
    ...(typeof o.publicadoEm === 'string' ? { publicadoEm: o.publicadoEm } : {}),
  };
}

export function normalizeAcessibilidadeFotos(raw: unknown): AcessibilidadeFoto[] {
  if (!Array.isArray(raw)) return [];
  const out: AcessibilidadeFoto[] = [];
  for (const item of raw) {
    const n = normalizeAcessibilidadeFoto(item);
    if (n) out.push(n);
  }
  return out;
}

/** Unit satisfies accessibility opportunity when at least one resource is declared correctly. */
export function unidadeTemAcessibilidadeDeclarada(metadata: unknown): boolean {
  const list = asRecord(metadata).acessibilidade;
  if (!Array.isArray(list) || list.length === 0) return false;
  return list.some((item) => {
    const row = asRecord(item);
    if (row.possui === false) return true;
    if (row.possui !== true) return false;
    const fotos = normalizeAcessibilidadeFotos(row.fotos);
    return fotos.some((f) => f.status === 'publicado');
  });
}

export function unidadeTemFotosAcessibilidadePendentes(metadata: unknown): boolean {
  const list = asRecord(metadata).acessibilidade;
  if (!Array.isArray(list)) return false;
  return list.some((item) => {
    const row = asRecord(item);
    if (row.possui !== true) return false;
    const fotos = normalizeAcessibilidadeFotos(row.fotos);
    return fotos.some((f) => f.status === 'pendente' || f.status === 'em_revisao');
  });
}
