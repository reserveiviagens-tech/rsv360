'use client';

import { useEffect } from 'react';
import type { GuestPreviewModel } from './build-guest-preview-model';

type Props = {
  model: GuestPreviewModel;
  onClose: () => void;
};

export function GuestListingPreview({ model, onClose }: Props) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-lg flex-col bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-preview-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 ring-1 ring-amber-200">
            Pré-visualização (rascunho)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
            aria-label="Fechar pré-visualização"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={model.heroUrl}
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent" />
          </div>

          <div className="space-y-4 px-4 py-5">
            <div>
              <h2 id="guest-preview-title" className="text-xl font-bold text-slate-900">
                {model.titulo}
              </h2>
              {model.metaLine ? (
                <p className="mt-1.5 text-sm text-slate-600">{model.metaLine}</p>
              ) : null}
            </div>

            {model.precoLabel ? (
              <p className="text-2xl font-semibold text-slate-900">
                {model.precoLabel}
              </p>
            ) : (
              <p className="text-sm text-slate-500">Preço não definido</p>
            )}

            {model.descricaoExcerpt ? (
              <section>
                <h3 className="text-sm font-semibold text-slate-900">Sobre o espaço</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {model.descricaoExcerpt}
                </p>
              </section>
            ) : null}

            {model.amenityChips.length > 0 ? (
              <section>
                <h3 className="text-sm font-semibold text-slate-900">Comodidades</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {model.amenityChips.map((chip) => (
                    <li
                      key={chip.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
                    >
                      <span aria-hidden>{chip.icon}</span>
                      {chip.label}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>

        {model.publicPageUrl ? (
          <div className="border-t border-slate-200 px-4 py-3">
            <a
              href={model.publicPageUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-sm font-medium text-teal-800 underline hover:text-teal-900"
            >
              Abrir página pública
            </a>
            <p className="mt-1 text-xs text-slate-500">
              Link da versão publicada salva no servidor (pode diferir do rascunho atual).
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
