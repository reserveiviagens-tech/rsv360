'use client';

import { NOME_INTERNO_MAX, TITULO_PUBLICO_MAX } from './titulo-limits';

type Props = {
  titulo: string;
  setTitulo: (v: string) => void;
  nomeInterno: string;
  setNomeInterno: (v: string) => void;
};

export function TituloEditor({ titulo, setTitulo, nomeInterno, setNomeInterno }: Props) {
  const tituloLen = titulo.length;
  const internoLen = nomeInterno.length;
  const tituloOk = titulo.trim().length > 0 && tituloLen <= TITULO_PUBLICO_MAX;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Título</h2>
        <p className="mt-1 text-sm text-slate-500">
          O título público aparece para hóspedes. O nome interno é só para você organizar os
          anúncios.
        </p>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-slate-900">Título do anúncio</span>
        <span className="mt-0.5 block text-xs text-slate-500">
          Visível no listing público · até {TITULO_PUBLICO_MAX} caracteres
        </span>
        <input
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base text-slate-900 outline-none ring-slate-900 focus:ring-2"
          maxLength={TITULO_PUBLICO_MAX}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex.: Apartamento aconchegante perto do parque"
          aria-invalid={!tituloOk}
        />
        <span
          className={`mt-1 block text-xs ${
            tituloLen >= TITULO_PUBLICO_MAX ? 'font-medium text-amber-700' : 'text-slate-500'
          }`}
        >
          {tituloLen}/{TITULO_PUBLICO_MAX}
          {!titulo.trim() ? ' · obrigatório' : ''}
        </span>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-900">Nome interno</span>
        <span className="mt-0.5 block text-xs text-slate-500">
          Só o anfitrião vê · útil na lista de anúncios e no calendário
        </span>
        <input
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base text-slate-900 outline-none ring-slate-900 focus:ring-2"
          maxLength={NOME_INTERNO_MAX}
          value={nomeInterno}
          onChange={(e) => setNomeInterno(e.target.value)}
          placeholder="Ex.: Apt 203 — torre B"
        />
        <span className="mt-1 block text-xs text-slate-500">
          {internoLen}/{NOME_INTERNO_MAX}
          {!nomeInterno.trim() ? ' · opcional' : ''}
        </span>
      </label>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prévia</p>
        <p className="mt-2 font-semibold text-slate-900">
          {titulo.trim() || 'Título do anúncio'}
        </p>
        {nomeInterno.trim() ? (
          <p className="mt-1 text-xs text-slate-500">Interno: {nomeInterno.trim()}</p>
        ) : (
          <p className="mt-1 text-xs text-slate-400">Sem nome interno</p>
        )}
      </div>
    </div>
  );
}
