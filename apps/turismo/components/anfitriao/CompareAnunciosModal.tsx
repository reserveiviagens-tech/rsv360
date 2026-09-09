'use client';

import { useMemo, useState } from 'react';
import { moneyBr, similarListingsBand } from './date-range-utils';

type Competitor = {
  id: string;
  label: string;
  preco: number;
  top: string;
  left: string;
  mine?: boolean;
  booked?: boolean;
};

type Props = {
  open: boolean;
  noites: number;
  precoMeu: number;
  precoSugerido: number;
  onClose: () => void;
};

function buildCompetitors(precoMeu: number, precoSugerido: number): Competitor[] {
  const band = similarListingsBand(precoSugerido);
  const seeds = [
    { f: 0.48, top: '18%', left: '22%', booked: true },
    { f: 0.55, top: '28%', left: '48%', booked: true },
    { f: 0.62, top: '42%', left: '31%', booked: true },
    { f: 0.7, top: '35%', left: '62%', booked: false },
    { f: 0.38, top: '55%', left: '18%', booked: true },
    { f: 1.15, top: '48%', left: '72%', booked: false },
    { f: 0.9, top: '62%', left: '55%', booked: false },
    { f: 0.52, top: '70%', left: '38%', booked: true },
  ];
  return [
    {
      id: 'mine',
      label: 'Seu anúncio',
      preco: Math.round(precoMeu),
      top: '40%',
      left: '44%',
      mine: true,
      booked: false,
    },
    ...seeds.map((s, i) => ({
      id: `c-${i}`,
      label: `Anúncio ${i + 1}`,
      preco: Math.round(band.min * s.f + (band.max - band.min) * (1 - s.f) * 0.3),
      top: s.top,
      left: s.left,
      booked: s.booked,
    })),
  ];
}

export function CompareAnunciosModal({
  open,
  noites,
  precoMeu,
  precoSugerido,
  onClose,
}: Props) {
  const [filtro, setFiltro] = useState<'com' | 'sem'>('com');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const competitors = useMemo(
    () => buildCompetitors(precoMeu, precoSugerido),
    [precoMeu, precoSugerido],
  );
  const band = similarListingsBand(precoSugerido);

  if (!open) return null;

  const visible = competitors.filter((c) => {
    if (c.mine) return true;
    return filtro === 'com' ? c.booked : !c.booked;
  });
  const selected = competitors.find((c) => c.id === selectedId) || null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-title"
    >
      <div className="relative flex h-[min(92vh,720px)] w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <button
          type="button"
          aria-label="Fechar"
          className="absolute left-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl shadow"
          onClick={onClose}
        >
          ×
        </button>

        <div className="relative min-w-0 flex-1 bg-gradient-to-br from-slate-100 via-emerald-50 to-sky-100">
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'linear-gradient(rgba(100,116,139,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(100,116,139,0.15) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
            aria-hidden
          />
          {visible.map((c) => (
            <button
              key={c.id}
              type="button"
              style={{ top: c.top, left: c.left }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-bold shadow-md ${
                c.mine
                  ? 'bg-rose-600 text-white'
                  : selectedId === c.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-900'
              }`}
              onClick={() => setSelectedId(c.id)}
            >
              {c.mine ? '⌂ ' : ''}
              {moneyBr(c.preco).replace(/\s/g, '')}
            </button>
          ))}

          {selected && !selected.mine && (
            <div
              className="absolute z-10 w-48 overflow-hidden rounded-2xl bg-white shadow-xl"
              style={{
                top: `calc(${selected.top} + 18px)`,
                left: selected.left,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="relative h-28 bg-gradient-to-br from-teal-400 to-emerald-700">
                <button
                  type="button"
                  className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-sm"
                  onClick={() => setSelectedId(null)}
                >
                  ×
                </button>
                <p className="absolute bottom-2 left-2 text-xs font-semibold text-white">
                  ★ 5 · 4 avaliações
                </p>
              </div>
            </div>
          )}

          <div className="absolute bottom-4 left-4 flex flex-col gap-1">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-lg font-bold shadow"
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-lg font-bold shadow"
              aria-label="Zoom out"
            >
              −
            </button>
          </div>
        </div>

        <aside className="flex w-full max-w-sm flex-col border-l border-slate-200 bg-white p-5">
          <h2 id="compare-title" className="text-xl font-bold text-slate-900">
            Compare anúncios parecidos
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Casa/apto inteiro · 1 quarto · {noites} noite{noites === 1 ? '' : 's'}
          </p>

          <button
            type="button"
            onClick={() => setFiltro('com')}
            className={`mt-5 rounded-xl border p-4 text-left ${
              filtro === 'com' ? 'border-slate-900' : 'border-slate-200'
            }`}
          >
            <p className="font-semibold text-slate-900">Anúncios com reserva</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              A maioria dos anúncios com reservas nessas datas estava na faixa de{' '}
              {moneyBr(band.min)} a {moneyBr(band.max)} em média por noite.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFiltro('sem')}
            className={`mt-3 rounded-xl border p-4 text-left ${
              filtro === 'sem' ? 'border-slate-900' : 'border-slate-200'
            }`}
          >
            <p className="font-semibold text-slate-900">Anúncios sem reserva</p>
            <p className="mt-2 text-sm text-slate-500">
              {filtro === 'sem'
                ? 'Anúncios semelhantes ainda sem reserva nestas datas.'
                : 'Toque para ver anúncios sem reserva no mapa.'}
            </p>
          </button>

          <button
            type="button"
            className="mt-auto pt-6 text-left text-sm font-medium text-slate-700 underline"
            onClick={onClose}
          >
            Saiba mais
          </button>
        </aside>
      </div>
    </div>
  );
}
