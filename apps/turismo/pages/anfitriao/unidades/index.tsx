'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import AnfitriaoRoleGuard from '../../../components/AnfitriaoRoleGuard';
import { AnfitriaoHostNav } from '../../../components/anfitriao/AnfitriaoHostNav';
import { AnfitriaoUnitSearchField } from '../../../components/anfitriao/AnfitriaoUnitSearchField';
import { useAnfitriaoMinhas } from '@/hooks/useAnfitriao';
import { filterUnitsBySearch } from '@/lib/anfitriao-unit-search';
import {
  compactThumbUrl,
  resolveUnitThumbUrl,
  statusPublicacaoLabel,
  unitThumbPlaceholder,
} from '../../../components/anfitriao/unit-thumb';

type AtivoTab = 'true' | 'false' | 'all';

type Unidade = {
  id: number;
  titulo: string;
  hotelId: string;
  statusPublicacao: string;
  precoDiaria?: string | number | null;
  midia?: unknown;
  metadata?: unknown;
  ativo?: boolean | null;
  quartos?: number | null;
  capacidadeMax?: number | null;
  amenidades?: unknown;
  utensilios?: unknown;
  eletrodomesticos?: unknown;
};

const ATIVO_TABS: { value: AtivoTab; label: string }[] = [
  { value: 'true', label: 'Ativos' },
  { value: 'false', label: 'Arquivados' },
  { value: 'all', label: 'Todos' },
];

function nomeInternoOf(u: Unidade): string {
  if (!u.metadata || typeof u.metadata !== 'object' || Array.isArray(u.metadata)) return '';
  const v = (u.metadata as Record<string, unknown>).nomeInterno;
  return typeof v === 'string' ? v.trim() : '';
}

function emptyListMessage(ativo: AtivoTab): string {
  if (ativo === 'false') {
    return 'Nenhum anúncio arquivado no seu escopo.';
  }
  if (ativo === 'all') {
    return 'Nenhuma unidade no seu escopo.';
  }
  return 'Nenhum anúncio ativo no seu escopo.';
}

export default function AnfitriaoUnidadesPage() {
  const [ativoFilter, setAtivoFilter] = useState<AtivoTab>('true');
  const { data, isLoading } = useAnfitriaoMinhas(1, 100, ativoFilter);
  const [query, setQuery] = useState('');
  const items = (data?.data?.items ?? []) as Unidade[];
  const filtered = useMemo(() => filterUnitsBySearch(items, query), [items, query]);

  return (
    <AnfitriaoRoleGuard>
      <Head>
        <title>Minhas unidades | Anfitrião</title>
      </Head>
      <div className="min-h-screen bg-slate-50">
        <AnfitriaoHostNav />
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-slate-900">Anúncios</h1>
            <p className="text-sm text-slate-600">
              Busque por nome, quartos, hóspedes ou características (piscina, wifi, pet…)
            </p>
          </div>

          <div
            className="mb-4 inline-flex rounded-xl border border-slate-200 bg-white p-1"
            role="tablist"
            aria-label="Filtrar anúncios"
          >
            {ATIVO_TABS.map((tab) => {
              const selected = ativoFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => {
                    setAtivoFilter(tab.value);
                    setQuery('');
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    selected
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <AnfitriaoUnitSearchField
            value={query}
            onChange={setQuery}
            resultCount={query ? filtered.length : undefined}
            totalCount={query ? items.length : undefined}
            className="mb-6 max-w-xl"
          />

          {isLoading && <p className="text-slate-600">Carregando...</p>}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((u) => {
              const thumb = resolveUnitThumbUrl(u.midia);
              const src = thumb ? compactThumbUrl(thumb, 320) : unitThumbPlaceholder();
              const interno = nomeInternoOf(u);
              const arquivado = u.ativo === false;
              return (
                <Link
                  key={u.id}
                  href={`/anfitriao/unidades/${u.id}`}
                  prefetch={false}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-slate-400"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt=""
                    width={320}
                    height={180}
                    loading="lazy"
                    decoding="async"
                    className="h-36 w-full object-cover"
                  />
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-semibold text-slate-900">{u.titulo}</p>
                      {arquivado ? (
                        <span className="shrink-0 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                          Arquivado
                        </span>
                      ) : null}
                    </div>
                    {interno ? (
                      <p className="truncate text-xs text-slate-500">Interno: {interno}</p>
                    ) : null}
                    <p className="text-xs text-slate-500">
                      {statusPublicacaoLabel(u.statusPublicacao)} · #{u.id}
                      {u.quartos != null ? ` · ${u.quartos} qto` : ''}
                      {u.capacidadeMax != null ? ` · ${u.capacidadeMax} hósp.` : ''}
                    </p>
                    <p className="mt-2 text-xs font-medium text-slate-700">Editar anúncio →</p>
                  </div>
                </Link>
              );
            })}
          </div>

          {!isLoading && items.length === 0 && (
            <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-slate-500">
              {emptyListMessage(ativoFilter)}
            </p>
          )}
          {!isLoading && items.length > 0 && filtered.length === 0 && (
            <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-slate-500">
              Nenhuma acomodação bate com essa busca nesta lista.
            </p>
          )}
        </div>
      </div>
    </AnfitriaoRoleGuard>
  );
}
