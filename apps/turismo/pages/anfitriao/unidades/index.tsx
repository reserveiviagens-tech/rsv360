'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useQueryClient } from '@tanstack/react-query';
import AnfitriaoRoleGuard from '../../../components/AnfitriaoRoleGuard';
import { AnfitriaoHostNav } from '../../../components/anfitriao/AnfitriaoHostNav';
import { AnfitriaoUnitSearchField } from '../../../components/anfitriao/AnfitriaoUnitSearchField';
import { useAnfitriaoMinhas } from '@/hooks/useAnfitriao';
import { filterUnitsBySearch } from '@/lib/anfitriao-unit-search';
import { fase1Api } from '@/lib/fase1-api';
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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [bulkMotivo, setBulkMotivo] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const items = (data?.data?.items ?? []) as Unidade[];
  const filtered = useMemo(() => filterUnitsBySearch(items, query), [items, query]);
  const isArchivedTab = ativoFilter === 'false';
  const selectionCount = selectedIds.size;
  const visibleIds = useMemo(() => filtered.map((u) => u.id), [filtered]);

  function toggleSelection(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedIds(new Set(visibleIds));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function handleBulkDesarquivar() {
    if (selectionCount === 0 || bulkLoading) return;
    setBulkLoading(true);
    setBulkError(null);
    setBulkSuccess(null);
    try {
      const ids = [...selectedIds];
      const motivo = bulkMotivo.trim() || undefined;
      const res = await fase1Api.anfitriaoDesarquivarUnidadesBulk(ids, motivo);
      const { restored, already_restored, failed } = res.data;
      const parts: string[] = [];
      if (restored > 0) parts.push(`${restored} reativado(s)`);
      if (already_restored > 0) parts.push(`${already_restored} já estava(m) ativo(s)`);
      if (failed > 0) parts.push(`${failed} falha(s)`);
      setBulkSuccess(parts.length > 0 ? parts.join(' · ') : 'Operação concluída.');
      setSelectedIds(new Set());
      setBulkMotivo('');
      await queryClient.invalidateQueries({ queryKey: ['anfitriao', 'minhas'] });
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Não foi possível reativar os anúncios.');
    } finally {
      setBulkLoading(false);
    }
  }

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
                    setSelectedIds(new Set());
                    setBulkError(null);
                    setBulkSuccess(null);
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

          {isArchivedTab && filtered.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={selectAllVisible}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Selecionar todos
              </button>
              <button
                type="button"
                onClick={clearSelection}
                disabled={selectionCount === 0}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Limpar
              </button>
            </div>
          )}

          {isArchivedTab && selectionCount > 0 && (
            <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
              <p className="mb-3 text-sm font-medium text-slate-900">
                Reativar {selectionCount} selecionado{selectionCount === 1 ? '' : 's'}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="flex-1">
                  <span className="mb-1 block text-xs font-medium text-slate-600">
                    Motivo (opcional)
                  </span>
                  <input
                    type="text"
                    value={bulkMotivo}
                    onChange={(e) => setBulkMotivo(e.target.value)}
                    maxLength={200}
                    placeholder="Ex.: retomada da temporada"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void handleBulkDesarquivar()}
                  disabled={bulkLoading}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {bulkLoading ? 'Reativando…' : `Reativar ${selectionCount} selecionado${selectionCount === 1 ? '' : 's'}`}
                </button>
              </div>
              {bulkError ? (
                <p className="mt-3 text-sm text-red-600" role="alert">
                  {bulkError}
                </p>
              ) : null}
              {bulkSuccess ? (
                <p className="mt-3 text-sm text-emerald-700" role="status">
                  {bulkSuccess}
                </p>
              ) : null}
            </div>
          )}

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
              const checked = selectedIds.has(u.id);
              return (
                <div
                  key={u.id}
                  className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-slate-400"
                >
                  {isArchivedTab && (
                    <div className="absolute left-3 top-3 z-10">
                      <input
                        type="checkbox"
                        checked={checked}
                        aria-label={`Selecionar ${u.titulo}`}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleSelection(u.id)}
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                      />
                    </div>
                  )}
                  <Link href={`/anfitriao/unidades/${u.id}`} prefetch={false} className="block">
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
                </div>
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
