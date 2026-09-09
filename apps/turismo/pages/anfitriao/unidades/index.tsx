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

type Unidade = {
  id: number;
  titulo: string;
  hotelId: string;
  statusPublicacao: string;
  precoDiaria?: string | number | null;
  midia?: unknown;
  quartos?: number | null;
  capacidadeMax?: number | null;
  amenidades?: unknown;
  utensilios?: unknown;
  eletrodomesticos?: unknown;
};

export default function AnfitriaoUnidadesPage() {
  const { data, isLoading } = useAnfitriaoMinhas(1, 100);
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
                    <p className="truncate font-semibold text-slate-900">{u.titulo}</p>
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
              Nenhuma unidade no seu escopo.
            </p>
          )}
          {!isLoading && items.length > 0 && filtered.length === 0 && (
            <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-slate-500">
              Nenhuma acomodação bate com essa busca.
            </p>
          )}
        </div>
      </div>
    </AnfitriaoRoleGuard>
  );
}
