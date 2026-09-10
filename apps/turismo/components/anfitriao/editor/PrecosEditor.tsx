'use client';

import Link from 'next/link';

type Props = {
  unitId: number;
  preco: string;
  setPreco: (v: string) => void;
  precoFds: string;
  setPrecoFds: (v: string) => void;
  precoInteligente: boolean;
  setPrecoInteligente: (v: boolean) => void;
  /** Controlled: whether weekend price row is shown (removable). */
  showFimSemana: boolean;
  setShowFimSemana: (v: boolean) => void;
};

export function summarizePrecosClient(
  preco: string,
  precoFds: string,
  precoInteligente: boolean,
): string | null {
  const base = Number(String(preco).replace(',', '.').trim());
  if (!Number.isFinite(base) || base <= 0) return null;
  const fixed = Number.isInteger(base) ? String(base) : base.toFixed(2).replace('.', ',');
  const parts = [`R$ ${fixed}/noite`];
  const fdsRaw = String(precoFds).replace(',', '.').trim();
  if (fdsRaw !== '') {
    const fds = Number(fdsRaw);
    if (Number.isFinite(fds) && fds > 0) {
      const fdsFixed = Number.isInteger(fds) ? String(fds) : fds.toFixed(2).replace('.', ',');
      parts.push(`Fim de semana R$ ${fdsFixed}`);
    }
  }
  if (precoInteligente) parts.push('Preço Inteligente');
  return parts.join(' · ');
}

export function PrecosEditor({
  unitId,
  preco,
  setPreco,
  precoFds,
  setPrecoFds,
  precoInteligente,
  setPrecoInteligente,
  showFimSemana,
  setShowFimSemana,
}: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Preços</h2>
        <p className="mt-1 text-sm text-slate-500">
          Defina o preço básico por noite. Opcionalmente, um preço de fim de semana e o Preço
          Inteligente. Ajustes por data ficam no calendário de tarifas.
        </p>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-slate-900">Preço básico</span>
        <span className="mt-0.5 block text-xs text-slate-500">
          Valor padrão por noite (R$) · obrigatório para anunciar
        </span>
        <div className="relative mt-2">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
            R$
          </span>
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-base text-slate-900 outline-none ring-slate-900 focus:ring-2"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            placeholder="0"
            aria-label="Preço básico em reais"
          />
        </div>
      </label>

      {showFimSemana ? (
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-3">
            <label className="block min-w-0 flex-1 text-sm">
              <span className="font-medium text-slate-900">Preço de fim de semana</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Sexta e sábado (quando o motor de temporada não estiver ativo)
              </span>
              <div className="relative mt-2">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                  R$
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-base text-slate-900 outline-none ring-slate-900 focus:ring-2"
                  value={precoFds}
                  onChange={(e) => setPrecoFds(e.target.value)}
                  placeholder="0"
                  aria-label="Preço de fim de semana em reais"
                />
              </div>
            </label>
            <button
              type="button"
              className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-slate-600 underline-offset-2 hover:underline"
              onClick={() => {
                setPrecoFds('');
                setShowFimSemana(false);
              }}
            >
              Remover
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="w-full rounded-xl border border-dashed border-slate-300 px-4 py-3 text-left text-sm font-medium text-slate-800 hover:border-slate-400 hover:bg-slate-50"
          onClick={() => setShowFimSemana(true)}
        >
          + Adicionar preço de fim de semana
        </button>
      )}

      <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-4">
        <span className="min-w-0">
          <span className="block text-sm font-medium text-slate-900">Preço Inteligente</span>
          <span className="mt-1 block text-xs text-slate-500">
            Ajusta automaticamente as noites no calendário conforme demanda, dentro dos limites
            configurados nas tarifas.
          </span>
        </span>
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300"
          checked={precoInteligente}
          onChange={(e) => setPrecoInteligente(e.target.checked)}
          aria-label="Ativar Preço Inteligente"
        />
      </label>

      <Link
        href={`/anfitriao/unidades/${unitId}/disponibilidade`}
        className="inline-flex text-sm font-medium text-slate-800 underline underline-offset-2"
        prefetch={false}
      >
        Abrir calendário de tarifas →
      </Link>
    </div>
  );
}
