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

export default function StaffCarteiraCorretorPage() {
  const { user } = useAuth();
  const role = String(user?.role ?? '');
  const isStaff = role === 'admin' || role === 'manager';
  const qc = useQueryClient();

  const [filterCorretorId, setFilterCorretorId] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'inativo'>('ativo');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
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
    enabled: isStaff && modalOpen && corretorQ.length >= 2,
  });

  const propsSearch = useQuery({
    queryKey: ['anfitriao', 'admin', 'carteira', 'proprietarios', propQ],
    queryFn: () => fase1Api.anfitriaoBuscarProprietariosStaff(propQ, 15),
    enabled: isStaff && modalOpen && propQ.length >= 2,
  });

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['anfitriao', 'admin', 'carteira'] });
  }, [qc]);

  const vincular = useMutation({
    mutationFn: () =>
      fase1Api.anfitriaoAtribuirCarteira(selectedCorretor!.id, selectedProp!.id),
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
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

  const onCsvChange = (value: string) => {
    setCsvText(value);
    setBulkPreview(parseCsvPairs(value));
  };

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
      <div className="min-h-screen bg-slate-50">
        <AnfitriaoHostNav />
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Carteira corretor</h1>
              <p className="mt-1 text-sm text-slate-600">
                Vincule corretores aos proprietários de cotas. Necessário para comissões MVP-B após proposta paga.
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              onClick={() => setModalOpen(true)}
            >
              Vincular par
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <label className="flex flex-col gap-1 text-xs text-slate-600">
              Filtrar corretor (ID)
              <input
                type="text"
                inputMode="numeric"
                value={filterCorretorId}
                onChange={(e) => {
                  setFilterCorretorId(e.target.value.replace(/\D/g, ''));
                  setPage(1);
                }}
                className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                placeholder="ex. 42"
              />
            </label>
            <label className="min-w-[200px] flex-1 flex-col gap-1 text-xs text-slate-600 sm:flex">
              Buscar nome/e-mail
              <input
                type="search"
                value={searchQ}
                onChange={(e) => {
                  setSearchQ(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                placeholder="Corretor ou proprietário…"
              />
            </label>
            <div className="flex flex-wrap items-end gap-2">
              {(['all', 'ativo', 'inativo'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setStatusFilter(s);
                    setPage(1);
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    statusFilter === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {s === 'all' ? 'Todos' : s}
                </button>
              ))}
            </div>
          </div>

          {list.isError && (
            <p className="mt-4 text-sm text-red-600">{(list.error as Error).message}</p>
          )}
          {(vincular.isError || bulk.isError || patchStatus.isError) && (
            <p className="mt-2 text-sm text-red-600">
              {((vincular.error || bulk.error || patchStatus.error) as Error)?.message}
            </p>
          )}

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Corretor</th>
                  <th className="px-4 py-3 font-medium">Proprietário</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Desde</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      Carregando…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      Nenhum vínculo neste filtro.
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr key={`${row.corretorId}-${row.proprietarioId}`} className="border-b border-slate-100">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {row.corretor?.name ?? `#${row.corretorId}`}
                        </div>
                        <div className="text-xs text-slate-500">
                          ID {row.corretorId} · {row.corretor?.email}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {row.proprietario?.name ?? `#${row.proprietarioId}`}
                        </div>
                        <div className="text-xs text-slate-500">
                          ID {row.proprietarioId} · {row.proprietario?.email}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            row.status === 'ativo'
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {row.criadoEm ? new Date(row.criadoEm).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {row.status === 'ativo' ? (
                          <button
                            type="button"
                            className="text-xs font-medium text-red-700 hover:underline"
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
                            className="text-xs font-medium text-emerald-700 hover:underline"
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

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
              <span>
                {total} vínculo{total === 1 ? '' : 's'} · página {page} de {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próxima
                </button>
              </div>
            </div>
          )}

          <section className="mt-10 rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Importação em lote (CSV)</h2>
            <p className="mt-1 text-sm text-slate-600">
              Uma linha por vínculo: <code className="text-xs">corretorId,proprietarioId</code>. Máximo 500
              linhas por envio.
            </p>
            <textarea
              value={csvText}
              onChange={(e) => onCsvChange(e.target.value)}
              rows={6}
              className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-800"
              placeholder={'corretorId,proprietarioId\n2,101\n2,102'}
            />
            {bulkPreview.length > 0 && (
              <p className="mt-2 text-xs text-slate-600">{bulkPreview.length} par(es) prontos para envio.</p>
            )}
            <button
              type="button"
              disabled={bulkPreview.length === 0 || bulk.isPending}
              className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-40"
              onClick={() => bulk.mutate(bulkPreview)}
            >
              {bulk.isPending ? 'Enviando…' : 'Importar lote'}
            </button>
            {bulk.isSuccess && bulk.data?.data?.summary && (
              <p className="mt-2 text-sm text-emerald-800">
                Concluído: {bulk.data.data.summary.ok} ok, {bulk.data.data.summary.fail} falha(s).
              </p>
            )}
          </section>

          <p className="mt-6 text-xs text-slate-500">
            Runbook:{' '}
            <Link href="/anfitriao/comissoes" className="underline">
              comissões corretor
            </Link>{' '}
            dependem destes vínculos ou de corretorId na proposta.
          </p>
        </div>
      </div>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="carteira-modal-title"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="carteira-modal-title" className="text-lg font-semibold text-slate-900">
              Vincular corretor ↔ proprietário
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600">Corretor</label>
                {selectedCorretor ? (
                  <div className="mt-1 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span>
                      #{selectedCorretor.id} {selectedCorretor.name} ({selectedCorretor.email})
                    </span>
                    <button
                      type="button"
                      className="text-xs text-slate-500 hover:text-slate-800"
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
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder="Buscar (mín. 2 caracteres)…"
                    />
                    <ul className="mt-1 max-h-32 overflow-auto rounded-lg border border-slate-100">
                      {(corretoresSearch.data?.data ?? []).map((u) => (
                        <li key={u.id}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
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
                <label className="text-xs font-medium text-slate-600">Proprietário (anfitrião)</label>
                {selectedProp ? (
                  <div className="mt-1 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span>
                      #{selectedProp.id} {selectedProp.name} ({selectedProp.email})
                    </span>
                    <button
                      type="button"
                      className="text-xs text-slate-500 hover:text-slate-800"
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
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder="Buscar (mín. 2 caracteres)…"
                    />
                    <ul className="mt-1 max-h-32 overflow-auto rounded-lg border border-slate-100">
                      {(propsSearch.data?.data ?? []).map((u) => (
                        <li key={u.id}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
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
                className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!selectedCorretor || !selectedProp || vincular.isPending}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                onClick={() => vincular.mutate()}
              >
                {vincular.isPending ? 'Salvando…' : 'Confirmar vínculo'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AnfitriaoRoleGuard>
  );
}
