'use client';

import { useCallback, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AnfitriaoRoleGuard from '../../../components/AnfitriaoRoleGuard';
import { AnfitriaoHostNav } from '../../../components/anfitriao/AnfitriaoHostNav';
import { useAuth } from '@/context/AuthContext';
import { fase1Api } from '@/lib/fase1-api';

type UserOption = { id: number; name: string | null; email: string; role: string | null };

type CarteiraRow = {
  corretorId: number;
  proprietarioId: number;
  status: string;
  criadoEm: string | null;
  corretor: UserOption | null;
  proprietario: UserOption | null;
};

function parseCsvPairs(text: string): Array<{ corretorId: number; proprietarioId: number }> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const pairs: Array<{ corretorId: number; proprietarioId: number }> = [];
  for (const line of lines) {
    if (/^corretor/i.test(line) && line.toLowerCase().includes('propriet')) continue;
    const parts = line.split(/[,;\t]/).map((p) => p.trim());
    if (parts.length < 2) continue;
    const corretorId = Number(parts[0]);
    const proprietarioId = Number(parts[1]);
    if (!Number.isFinite(corretorId) || !Number.isFinite(proprietarioId)) continue;
    pairs.push({ corretorId, proprietarioId });
  }
  return pairs;
}

function StatusBadge({ status }: { status: string }) {
  const ativo = status === 'ativo';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${
        ativo
          ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/20'
          : 'bg-slate-100 text-slate-600 ring-slate-500/15'
      }`}
    >
      {status}
    </span>
  );
}

function KpiCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'accent' | 'mint';
}) {
  const toneClass =
    tone === 'accent'
      ? 'border-blue-200/80 bg-gradient-to-br from-white to-blue-50/50'
      : tone === 'mint'
        ? 'border-emerald-200/70 bg-gradient-to-br from-white to-emerald-50/40'
        : 'border-slate-200/90 bg-white';
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default function StaffCarteiraCorretorPage() {
  const { user } = useAuth();
  const role = String(user?.role ?? '');
  const isStaff = role === 'admin' || role === 'manager';
  const qc = useQueryClient();

  const [filterCorretorId, setFilterCorretorId] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'inativo'>('ativo');
  const [page, setPage] = useState(1);

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [corretorQ, setCorretorQ] = useState('');
  const [propQ, setPropQ] = useState('');
  const [selectedCorretor, setSelectedCorretor] = useState<UserOption | null>(null);
  const [selectedProp, setSelectedProp] = useState<UserOption | null>(null);

  const [csvText, setCsvText] = useState('');
  const [bulkPreview, setBulkPreview] = useState<Array<{ corretorId: number; proprietarioId: number }>>([]);

  const listParams = useMemo(
    () => ({
      corretorId: filterCorretorId ? Number(filterCorretorId) : undefined,
      q: searchQ.trim() || undefined,
      status: statusFilter,
      page,
      pageSize: 25,
    }),
    [filterCorretorId, searchQ, statusFilter, page],
  );

  const list = useQuery({
    queryKey: ['anfitriao', 'admin', 'carteira', listParams],
    queryFn: () => fase1Api.anfitriaoListarCarteiraCorretor(listParams),
    enabled: isStaff,
  });

  const corretoresSearch = useQuery({
    queryKey: ['anfitriao', 'admin', 'carteira', 'corretores', corretorQ],
    queryFn: () => fase1Api.anfitriaoBuscarCorretoresStaff(corretorQ, 15),
    enabled: isStaff && linkModalOpen && corretorQ.length >= 2,
  });

  const propsSearch = useQuery({
    queryKey: ['anfitriao', 'admin', 'carteira', 'proprietarios', propQ],
    queryFn: () => fase1Api.anfitriaoBuscarProprietariosStaff(propQ, 15),
    enabled: isStaff && linkModalOpen && propQ.length >= 2,
  });

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['anfitriao', 'admin', 'carteira'] });
  }, [qc]);

  const vincular = useMutation({
    mutationFn: () =>
      fase1Api.anfitriaoAtribuirCarteira(selectedCorretor!.id, selectedProp!.id),
    onSuccess: () => {
      invalidate();
      setLinkModalOpen(false);
      setSelectedCorretor(null);
      setSelectedProp(null);
      setCorretorQ('');
      setPropQ('');
    },
  });

  const bulk = useMutation({
    mutationFn: (items: Array<{ corretorId: number; proprietarioId: number }>) =>
      fase1Api.anfitriaoAtribuirCarteiraBulk(items),
    onSuccess: () => {
      invalidate();
      setCsvText('');
      setBulkPreview([]);
    },
  });

  const patchStatus = useMutation({
    mutationFn: ({
      corretorId,
      proprietarioId,
      status,
    }: {
      corretorId: number;
      proprietarioId: number;
      status: 'ativo' | 'inativo';
    }) => fase1Api.anfitriaoAtualizarCarteiraStatus(corretorId, proprietarioId, status),
    onSuccess: () => invalidate(),
  });

  const payload = list.data?.data;
  const items = (payload?.items ?? []) as CarteiraRow[];
  const total = payload?.total ?? 0;
  const pageSize = payload?.pageSize ?? 25;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const ativosOnPage = useMemo(() => items.filter((r) => r.status === 'ativo').length, [items]);

  const onCsvChange = (value: string) => {
    setCsvText(value);
    setBulkPreview(parseCsvPairs(value));
  };

  const statusFilterLabel =
    statusFilter === 'all' ? 'Todos os status' : statusFilter === 'ativo' ? 'Somente ativos' : 'Inativos';

  if (!isStaff) {
    return (
      <AnfitriaoRoleGuard>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-slate-600">
          Acesso restrito a admin/manager.
        </div>
      </AnfitriaoRoleGuard>
    );
  }

  return (
    <AnfitriaoRoleGuard>
      <Head>
        <title>Carteira corretor | Staff</title>
      </Head>
      <div className="min-h-screen bg-[#eef0f4]">
        <AnfitriaoHostNav />
        <div className="border-b border-slate-200/80 bg-gradient-to-b from-slate-900 to-[#1e3a8a] text-white">
          <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-blue-200/90">Staff · Captação</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">Carteira corretor</h1>
                <p className="mt-2 max-w-xl text-sm text-slate-200/90">
                  Vínculos validados para comissões MVP-B após proposta paga. Motor testado em staging.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium backdrop-blur transition hover:bg-white/15"
                  onClick={() => setCsvModalOpen(true)}
                >
                  Importar CSV
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:bg-blue-600"
                  onClick={() => setLinkModalOpen(true)}
                >
                  Vincular par
                </button>
              </div>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Total no filtro"
                value={list.isLoading ? '…' : total.toLocaleString('pt-BR')}
                hint={statusFilterLabel}
                tone="accent"
              />
              <KpiCard
                label="Nesta página"
                value={items.length}
                hint={`Página ${page} de ${totalPages}`}
              />
              <KpiCard
                label="Ativos (página)"
                value={ativosOnPage}
                hint="Badge verde = comissão elegível"
                tone="mint"
              />
              <KpiCard
                label="Corretor (filtro)"
                value={filterCorretorId ? `#${filterCorretorId}` : 'Todos'}
                hint={searchQ ? `Busca: “${searchQ.slice(0, 24)}${searchQ.length > 24 ? '…' : ''}”` : 'Sem busca textual'}
              />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Corretor (ID)
                <input
                  type="text"
                  inputMode="numeric"
                  value={filterCorretorId}
                  onChange={(e) => {
                    setFilterCorretorId(e.target.value.replace(/\D/g, ''));
                    setPage(1);
                  }}
                  className="w-28 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-600/0 transition focus:border-blue-300 focus:ring-2 focus:ring-blue-600/20"
                  placeholder="ID"
                />
              </label>
              <label className="min-w-[220px] flex-1 flex-col gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Buscar
                <input
                  type="search"
                  value={searchQ}
                  onChange={(e) => {
                    setSearchQ(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-600/20"
                  placeholder="Nome ou e-mail mascarado…"
                />
              </label>
              <div className="flex flex-wrap gap-1.5 pb-0.5" role="group" aria-label="Filtrar status">
                {(['all', 'ativo', 'inativo'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setStatusFilter(s);
                      setPage(1);
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      statusFilter === s
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                    }`}
                  >
                    {s === 'all' ? 'Todos' : s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {list.isError && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {(list.error as Error).message}
            </p>
          )}
          {(vincular.isError || bulk.isError || patchStatus.isError) && (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {((vincular.error || bulk.error || patchStatus.error) as Error)?.message}
            </p>
          )}

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Vínculos</h2>
              <span className="text-xs text-slate-500">
                {total.toLocaleString('pt-BR')} registro{total === 1 ? '' : 's'}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50/90 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Corretor</th>
                    <th className="px-4 py-3">Proprietário</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="hidden px-4 py-3 sm:table-cell">Desde</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                        Carregando carteira…
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                        Nenhum vínculo neste filtro.
                      </td>
                    </tr>
                  ) : (
                    items.map((row) => (
                      <tr
                        key={`${row.corretorId}-${row.proprietarioId}`}
                        className="transition hover:bg-slate-50/80"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">
                            {row.corretor?.name ?? `Corretor #${row.corretorId}`}
                          </div>
                          <div className="mt-0.5 font-mono text-[11px] text-slate-500">
                            ID {row.corretorId} · {row.corretor?.email}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">
                            {row.proprietario?.name ?? `Proprietário #${row.proprietarioId}`}
                          </div>
                          <div className="mt-0.5 font-mono text-[11px] text-slate-500">
                            ID {row.proprietarioId} · {row.proprietario?.email}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">
                          {row.criadoEm ? new Date(row.criadoEm).toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {row.status === 'ativo' ? (
                            <button
                              type="button"
                              className="rounded-lg px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50"
                              disabled={patchStatus.isPending}
                              onClick={() =>
                                patchStatus.mutate({
                                  corretorId: row.corretorId,
                                  proprietarioId: row.proprietarioId,
                                  status: 'inativo',
                                })
                              }
                            >
                              Inativar
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="rounded-lg px-2 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50"
                              disabled={patchStatus.isPending}
                              onClick={() =>
                                patchStatus.mutate({
                                  corretorId: row.corretorId,
                                  proprietarioId: row.proprietarioId,
                                  status: 'ativo',
                                })
                              }
                            >
                              Reativar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
              <span>
                Página {page} de {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm disabled:opacity-40"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm disabled:opacity-40"
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próxima
                </button>
              </div>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-slate-500">
            Comissões após{' '}
            <Link href="/anfitriao/comissoes" className="font-medium text-blue-700 underline-offset-2 hover:underline">
              proposta paid
            </Link>{' '}
            · contratos <code className="text-[10px]">fase1Api</code> inalterados
          </p>
        </div>
      </div>

      {linkModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="carteira-link-modal-title"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl">
            <h2 id="carteira-link-modal-title" className="text-lg font-semibold text-slate-900">
              Vincular corretor ↔ proprietário
            </h2>
            <p className="mt-1 text-sm text-slate-600">Busca com autocomplete staff (mín. 2 caracteres).</p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Corretor</label>
                {selectedCorretor ? (
                  <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-sm ring-1 ring-slate-200/80">
                    <span>
                      #{selectedCorretor.id} {selectedCorretor.name} ({selectedCorretor.email})
                    </span>
                    <button
                      type="button"
                      className="text-xs font-medium text-blue-700 hover:underline"
                      onClick={() => setSelectedCorretor(null)}
                    >
                      Trocar
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="search"
                      value={corretorQ}
                      onChange={(e) => setCorretorQ(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-600/20"
                      placeholder="Buscar corretor…"
                    />
                    <ul className="mt-2 max-h-36 overflow-auto rounded-xl border border-slate-100 bg-white shadow-inner">
                      {(corretoresSearch.data?.data ?? []).map((u) => (
                        <li key={u.id}>
                          <button
                            type="button"
                            className="w-full px-3 py-2.5 text-left text-sm transition hover:bg-blue-50/80"
                            onClick={() => setSelectedCorretor(u)}
                          >
                            #{u.id} {u.name ?? '—'} · {u.email}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Proprietário (anfitrião)
                </label>
                {selectedProp ? (
                  <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-sm ring-1 ring-slate-200/80">
                    <span>
                      #{selectedProp.id} {selectedProp.name} ({selectedProp.email})
                    </span>
                    <button
                      type="button"
                      className="text-xs font-medium text-blue-700 hover:underline"
                      onClick={() => setSelectedProp(null)}
                    >
                      Trocar
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="search"
                      value={propQ}
                      onChange={(e) => setPropQ(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-600/20"
                      placeholder="Buscar proprietário…"
                    />
                    <ul className="mt-2 max-h-36 overflow-auto rounded-xl border border-slate-100 bg-white shadow-inner">
                      {(propsSearch.data?.data ?? []).map((u) => (
                        <li key={u.id}>
                          <button
                            type="button"
                            className="w-full px-3 py-2.5 text-left text-sm transition hover:bg-blue-50/80"
                            onClick={() => setSelectedProp(u)}
                          >
                            #{u.id} {u.name ?? '—'} · {u.email}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                onClick={() => setLinkModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!selectedCorretor || !selectedProp || vincular.isPending}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                onClick={() => vincular.mutate()}
              >
                {vincular.isPending ? 'Salvando…' : 'Confirmar vínculo'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {csvModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="carteira-csv-modal-title"
        >
          <div className="w-full max-w-xl rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl">
            <h2 id="carteira-csv-modal-title" className="text-lg font-semibold text-slate-900">
              Importação em lote (CSV)
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Uma linha por vínculo:{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">corretorId,proprietarioId</code>. Máximo
              500 linhas por envio.
            </p>
            <textarea
              value={csvText}
              onChange={(e) => onCsvChange(e.target.value)}
              rows={8}
              className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3 py-3 font-mono text-xs leading-relaxed text-slate-800 outline-none focus:ring-2 focus:ring-blue-600/20"
              placeholder={'corretorId,proprietarioId\n2,101\n2,102'}
            />
            {bulkPreview.length > 0 ? (
              <p className="mt-3 text-sm font-medium text-blue-900">
                {bulkPreview.length.toLocaleString('pt-BR')} par(es) prontos para envio.
              </p>
            ) : (
              <p className="mt-3 text-xs text-slate-500">Cole o CSV ou digite linha a linha.</p>
            )}
            {bulk.isSuccess && bulk.data?.data?.summary ? (
              <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-600/15">
                Concluído: {bulk.data.data.summary.ok} ok · {bulk.data.data.summary.fail} falha(s)
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                onClick={() => setCsvModalOpen(false)}
              >
                Fechar
              </button>
              <button
                type="button"
                disabled={bulkPreview.length === 0 || bulk.isPending}
                className="rounded-xl bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white shadow-md disabled:opacity-40"
                onClick={() => bulk.mutate(bulkPreview)}
              >
                {bulk.isPending ? 'Enviando…' : 'Importar lote'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AnfitriaoRoleGuard>
  );
}
