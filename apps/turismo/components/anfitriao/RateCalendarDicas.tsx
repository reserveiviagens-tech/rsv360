'use client';

import { useEffect, useMemo, useState } from 'react';
import { moneyBr } from './date-range-utils';

const STORAGE_KEY = 'rsv360.anfitriao.dicas.ocultas';
const TIP_DISMISS_KEY = 'rsv360.anfitriao.dicas.tip-dismissed';

type Props = {
  precoSugerido?: number;
  ganhoBuscasPct?: number;
  /** Opens competitive pricing flow (select nights → multi edit). */
  onCompetitiveTipClick?: () => void;
  className?: string;
};

export function RateCalendarDicas({
  precoSugerido = 199,
  ganhoBuscasPct = 26,
  onCompetitiveTipClick,
  className = '',
}: Props) {
  const [ocultas, setOcultas] = useState(true);
  const [tipDismissed, setTipDismissed] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setOcultas(localStorage.getItem(STORAGE_KEY) !== '0');
      setTipDismissed(localStorage.getItem(TIP_DISMISS_KEY) === '1');
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const unreadCount = useMemo(() => (tipDismissed ? 0 : 1), [tipDismissed]);

  function setOcultasPersist(next: boolean) {
    setOcultas(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

  function dismissTip() {
    setTipDismissed(true);
    try {
      localStorage.setItem(TIP_DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  }

  if (!hydrated) {
    return <div className={`h-10 w-36 animate-pulse rounded-full bg-slate-200 ${className}`} aria-hidden />;
  }

  if (ocultas) {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => setOcultasPersist(false)}
          className="inline-flex items-center gap-2 rounded-full bg-slate-200/90 py-2 pl-4 pr-2 text-sm font-medium text-slate-800 transition hover:bg-slate-300/80"
          aria-label={
            unreadCount > 0
              ? `Mostrar dicas, ${unreadCount} nova`
              : 'Mostrar dicas'
          }
        >
          <span>Mostrar dicas</span>
          {unreadCount > 0 ? (
            <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
              {unreadCount}
            </span>
          ) : null}
        </button>
      </div>
    );
  }

  return (
    <>
      <section className={`rounded-2xl border border-slate-200 bg-slate-100/80 p-4 ${className}`}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900">Dicas</h2>
          <button
            type="button"
            onClick={() => setOcultasPersist(true)}
            className="rounded-full bg-slate-200/80 px-3 py-1 text-xs font-medium text-slate-800"
          >
            Ocultar dicas
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl bg-slate-200/60">
          <div
            className="relative h-36 bg-gradient-to-br from-sky-400 via-teal-500 to-emerald-600"
            aria-hidden
          >
            <div className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow">
              <span className="text-sm font-bold text-slate-800">↗</span>
            </div>
          </div>
          <p className="px-4 py-3 text-center text-sm font-semibold text-slate-900">
            Ajude seu anúncio a se destacar e ganhe mais
          </p>

          {!tipDismissed && (
            <div className="relative mx-3 mb-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <button
                type="button"
                aria-label="Dispensar dica"
                className="absolute right-2 top-2 z-10 text-slate-400 hover:text-slate-700"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissTip();
                }}
              >
                ×
              </button>
              <button
                type="button"
                className="flex w-full gap-3 pr-4 text-left transition hover:opacity-90"
                onClick={() => onCompetitiveTipClick?.()}
              >
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs text-white"
                  aria-hidden
                >
                  R$
                </span>
                <div>
                  <p className="text-sm font-semibold text-sky-700">
                    Defina um preço básico competitivo
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Seu anúncio poderia aparecer em até {ganhoBuscasPct}% mais buscas com um preço
                    de {moneyBr(precoSugerido).replace(/\s/g, '')}.
                  </p>
                </div>
              </button>
            </div>
          )}

          {tipDismissed && (
            <p className="px-4 pb-4 text-center text-xs text-slate-500">
              Nenhuma dica nova no momento.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className="mt-3 w-full text-center text-sm text-slate-700 underline"
        >
          Saiba mais
        </button>
      </section>

      {modalAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-busca-title"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 id="modal-busca-title" className="text-lg font-bold text-slate-900">
                Sobre os resultados de busca
              </h3>
              <button
                type="button"
                aria-label="Fechar"
                className="text-xl leading-none text-slate-500"
                onClick={() => setModalAberto(false)}
              >
                ×
              </button>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              A posição do seu anúncio na Reservei Viagens compara-o a anúncios semelhantes na
              região. Consideramos localização, tamanho, comodidades, avaliações e o comportamento
              dos hóspedes. Os resultados usam dados passados; o desempenho futuro pode variar.
            </p>
            <button
              type="button"
              className="mt-4 w-full rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-900"
              onClick={() => setModalAberto(false)}
            >
              Como funcionam os resultados de busca
            </button>
          </div>
        </div>
      )}
    </>
  );
}
