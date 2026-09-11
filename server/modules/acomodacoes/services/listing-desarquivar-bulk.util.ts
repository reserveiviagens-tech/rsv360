export const BULK_DESARQUIVAR_MAX = 50;

export function parseBulkIds(
  raw: unknown,
  max = BULK_DESARQUIVAR_MAX,
): number[] | { error: string } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { error: 'ids é obrigatório (array de inteiros)' };
  }
  if (raw.length > max) {
    return { error: `Máximo ${max} ids por requisição` };
  }
  const seen = new Set<number>();
  const ids: number[] = [];
  for (const item of raw) {
    if (typeof item !== 'number' || !Number.isInteger(item) || item <= 0) {
      return { error: 'Cada id deve ser um inteiro positivo' };
    }
    if (!seen.has(item)) {
      seen.add(item);
      ids.push(item);
    }
  }
  return ids;
}
