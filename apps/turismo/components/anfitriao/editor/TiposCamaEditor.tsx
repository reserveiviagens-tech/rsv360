'use client';

export const CAMA_CATALOG = [
  { id: 'solteiro', label: 'Solteiro', icon: '🛏' },
  { id: 'casal', label: 'Casal', icon: '🛏' },
  { id: 'queen', label: 'Queen', icon: '🛏' },
  { id: 'king', label: 'King', icon: '🛏' },
  { id: 'viuva', label: 'Viúva', icon: '🛏' },
  { id: 'beliche', label: 'Beliche', icon: '🪜' },
  { id: 'sofa_cama', label: 'Sofá-cama', icon: '🛋' },
  { id: 'sofa', label: 'Sofá', icon: '🛋' },
  { id: 'colchao_chao', label: 'Colchão no chão', icon: '🟫' },
  { id: 'colchao_ar', label: 'Colchão de ar', icon: '💨' },
  { id: 'berco', label: 'Berço', icon: '🍼' },
  { id: 'cama_infantil', label: 'Cama infantil', icon: '🧸' },
  { id: 'rede', label: 'Rede', icon: '🪢' },
  { id: 'colchao_agua', label: 'Colchão de água', icon: '💧' },
] as const;

export const CAMA_COUNT_MAX = 30;

export type TiposCamaMap = Record<string, number>;

type Props = {
  value: TiposCamaMap;
  onChange: (next: TiposCamaMap) => void;
};

function phrase(id: string, n: number, label: string): string {
  const plural = n === 1 ? '' : 's';
  if (id === 'sofa_cama') return `${n} sofá-cama${plural}`;
  if (id === 'sofa') return `${n} sofá${n === 1 ? '' : 's'}`;
  if (id === 'berco') return `${n} berço${plural}`;
  if (id === 'rede') return `${n} rede${plural}`;
  if (id === 'beliche') return `${n} beliche${plural}`;
  if (id === 'colchao_chao') return `${n} colchão${plural} no chão`;
  if (id === 'colchao_ar') return `${n} colchão${plural} de ar`;
  if (id === 'colchao_agua') return `${n} colchão${plural} de água`;
  if (id === 'cama_infantil') return `${n} cama${plural} infantil${n === 1 ? '' : 'is'}`;
  const nome = label.toLowerCase();
  return n === 1 ? `1 cama de ${nome}` : `${n} camas de ${nome}`;
}

export function summarizeTiposCamaClient(value: TiposCamaMap): string | null {
  const parts: string[] = [];
  for (const item of CAMA_CATALOG) {
    const n = Number(value[item.id] ?? 0);
    if (n > 0) parts.push(phrase(item.id, n, item.label));
  }
  return parts.length ? parts.join(', ') : null;
}

const LEGACY_LABEL_TO_ID: Record<string, string> = Object.fromEntries([
  ...CAMA_CATALOG.map((c) => [c.id, c.id] as const),
  ...CAMA_CATALOG.map((c) => [c.label.toLowerCase(), c.id] as const),
  ['viúva', 'viuva'],
  ['sofá-cama', 'sofa_cama'],
  ['sofa-cama', 'sofa_cama'],
  ['berço', 'berco'],
  ['colchão no chão', 'colchao_chao'],
  ['colchão de ar', 'colchao_ar'],
  ['colchão de água', 'colchao_agua'],
]);

/** Normalize legacy Portuguese labels → canonical ids for editor state. */
export function normalizeTiposCamaClient(raw: unknown): TiposCamaMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: TiposCamaMap = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    const id = LEGACY_LABEL_TO_ID[key.trim().toLowerCase()];
    if (!id) continue;
    const n = typeof val === 'number' ? val : Number(val);
    if (!Number.isFinite(n) || n <= 0) continue;
    out[id] = (out[id] ?? 0) + Math.min(CAMA_COUNT_MAX, Math.floor(n));
  }
  return out;
}

export function TiposCamaEditor({ value, onChange }: Props) {
  function setCount(id: string, next: number) {
    const n = Math.max(0, Math.min(CAMA_COUNT_MAX, Math.floor(next)));
    const copy = { ...value };
    if (n <= 0) delete copy[id];
    else copy[id] = n;
    onChange(copy);
  }

  const summary = summarizeTiposCamaClient(value);
  const total = CAMA_CATALOG.reduce((acc, item) => acc + (Number(value[item.id] ?? 0) || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Tipos de cama</h2>
        <p className="mt-1 text-sm text-slate-500">
          Informe quantas camas de cada tipo o espaço oferece. Isso aparece no anúncio e nas
          oportunidades do desempenho.
        </p>
      </div>

      <ul className="space-y-2">
        {CAMA_CATALOG.map((item) => {
          const count = Number(value[item.id] ?? 0) || 0;
          return (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg" aria-hidden>
                  {item.icon}
                </span>
                <span className="truncate text-sm font-medium text-slate-900">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Diminuir ${item.label}`}
                  disabled={count <= 0}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-lg leading-none disabled:opacity-40"
                  onClick={() => setCount(item.id, count - 1)}
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-semibold tabular-nums text-slate-900">
                  {count}
                </span>
                <button
                  type="button"
                  aria-label={`Aumentar ${item.label}`}
                  disabled={count >= CAMA_COUNT_MAX}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-lg leading-none disabled:opacity-40"
                  onClick={() => setCount(item.id, count + 1)}
                >
                  +
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prévia</p>
        <p className="mt-2 font-semibold text-slate-900">
          {summary || 'Nenhuma cama informada'}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {total === 0 ? 'Adicione pelo menos uma cama' : `${total} unidade(s) no total`}
        </p>
      </div>
    </div>
  );
}
