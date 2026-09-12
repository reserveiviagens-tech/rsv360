'use client';

import { useEffect, useState } from 'react';
import { fase1Api } from '@/lib/fase1-api';
import type { GuestPreviewModel } from './build-guest-preview-model';

type Props = {
  model: GuestPreviewModel;
  unitId?: number;
  onClose: () => void;
};

function formatExpiresHint(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export function GuestListingPreview({ model, unitId, onClose }: Props) {
  const [previewLinkStatus, setPreviewLinkStatus] = useState<'idle' | 'loading' | 'copied' | 'error'>('idle');
  const [previewExpiresAt, setPreviewExpiresAt] = useState<string | null>(null);
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const showGallery = model.galleryUrls.length > 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-3xl flex-col bg-stone-50 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-preview-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4 py-3">
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 ring-1 ring-amber-200">
            Pré-visualização (rascunho)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100"
            aria-label="Fechar pré-visualização"
          >
            ✕
          </button>
        </div>

        <div className="relative min-h-[22vh] shrink-0 overflow-hidden bg-stone-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={model.heroUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/30 to-transparent" />
          <div className="relative flex min-h-[22vh] flex-col justify-end px-4 pb-6 pt-10">
            <p className="text-xs font-medium tracking-wide text-amber-200/90 sm:text-sm">
              Reservei Viagens
            </p>
            <h2
              id="guest-preview-title"
              className="mt-1.5 max-w-2xl text-xl font-semibold tracking-tight text-white sm:text-2xl"
            >
              {model.titulo}
            </h2>
            {model.locationLine ? (
              <p className="mt-1.5 text-sm text-stone-200">{model.locationLine}</p>
            ) : null}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-6 px-4 py-6 sm:grid-cols-[1.4fr_0.8fr] sm:px-5">
            <section className="min-w-0 space-y-6">
              {model.descricaoExcerpt ? (
                <div>
                  <h3 className="text-base font-semibold text-stone-900">Sobre o espaço</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
                    {model.descricaoExcerpt}
                  </p>
                </div>
              ) : null}

              {model.enderecoPublico ? (
                <div>
                  <h3 className="text-base font-semibold text-stone-900">Endereço</h3>
                  <p className="mt-1 text-sm text-stone-700">{model.enderecoPublico}</p>
                </div>
              ) : null}

              {showGallery ? (
                <div>
                  <h3 className="text-base font-semibold text-stone-900">Fotos</h3>
                  <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {model.galleryUrls.slice(0, 6).map((src) => (
                      <li key={src} className="aspect-[4/3] overflow-hidden rounded-lg bg-stone-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="h-full w-full object-cover" />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {model.amenityChips.length > 0 ? (
                <div>
                  <h3 className="text-base font-semibold text-stone-900">Comodidades</h3>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {model.amenityChips.map((chip) => (
                      <li
                        key={chip.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700"
                      >
                        <span aria-hidden>{chip.icon}</span>
                        {chip.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>

            <aside className="sticky top-0 h-fit self-start rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              {model.precoLabel ? (
                <p className="text-2xl font-semibold text-stone-900">
                  {model.precoLabel.replace(' / noite', '')}
                  <span className="text-sm font-normal text-stone-500"> / noite</span>
                </p>
              ) : (
                <p className="text-sm text-stone-600">Consulte valores na cotação</p>
              )}

              <ul className="mt-4 space-y-2 text-sm text-stone-700">
                {model.capacidadeLabel ? <li>{model.capacidadeLabel}</li> : null}
                {model.quartosLabel ? <li>{model.quartosLabel}</li> : null}
                {model.modoReservaLabel ? <li>{model.modoReservaLabel}</li> : null}
                {model.localVerificado ? <li>Localização verificada</li> : null}
              </ul>

              {model.mensagemPreReserva ? (
                <p className="mt-4 rounded-lg bg-stone-50 p-3 text-xs text-stone-600">
                  {model.mensagemPreReserva}
                </p>
              ) : null}

              <button
                type="button"
                disabled
                className="mt-6 flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-stone-300 px-4 py-3 text-sm font-medium text-stone-600"
                aria-disabled="true"
              >
                Solicitar cotação
              </button>
              <p className="mt-3 text-center text-xs text-stone-500">
                Pré-visualização — ação indisponível no rascunho
              </p>
            </aside>
          </div>
        </div>

        <div className="shrink-0 space-y-3 border-t border-stone-200 bg-white px-4 py-3">
          {unitId != null ? (
            <div>
              <button
                type="button"
                disabled={previewLinkStatus === 'loading'}
                onClick={() => {
                  void (async () => {
                    setPreviewLinkStatus('loading');
                    try {
                      const res = await fase1Api.anfitriaoCriarPreviewLink(unitId);
                      const url = res?.data?.url;
                      if (!url) throw new Error('Resposta inválida');
                      await navigator.clipboard.writeText(url);
                      setPreviewExpiresAt(res.data.expiresAt ?? null);
                      setPreviewLinkStatus('copied');
                    } catch {
                      setPreviewLinkStatus('error');
                    }
                  })();
                }}
                className="inline-flex items-center rounded-lg bg-teal-800 px-3 py-2 text-sm font-medium text-white hover:bg-teal-900 disabled:opacity-60"
              >
                {previewLinkStatus === 'loading'
                  ? 'Gerando link…'
                  : previewLinkStatus === 'copied'
                    ? 'Link copiado!'
                    : 'Copiar link de pré-visualização'}
              </button>
              {previewLinkStatus === 'copied' && previewExpiresAt ? (
                <p className="mt-1.5 text-xs text-stone-600">
                  Válido até {formatExpiresHint(previewExpiresAt)} (72 h).
                </p>
              ) : null}
              {previewLinkStatus === 'error' ? (
                <p className="mt-1.5 text-xs text-red-700">
                  Não foi possível gerar o link. Tente novamente.
                </p>
              ) : null}
              <p className="mt-1 text-xs text-stone-500">
                Compartilhe só com quem deve ver o rascunho. O link expira em 72 horas.
              </p>
            </div>
          ) : null}

          {model.publicPageUrl ? (
            <div>
              <a
                href={model.publicPageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-sm font-medium text-teal-800 underline hover:text-teal-900"
              >
                Abrir página pública
              </a>
              <p className="mt-1 text-xs text-stone-500">
                Link da versão publicada salva no servidor (pode diferir do rascunho atual).
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
