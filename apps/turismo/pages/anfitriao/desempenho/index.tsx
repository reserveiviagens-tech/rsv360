'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import AnfitriaoRoleGuard from '../../../components/AnfitriaoRoleGuard';
import { AnfitriaoHostNav } from '../../../components/anfitriao/AnfitriaoHostNav';
import { fase1Api, FASE1_API_BASE } from '@/lib/fase1-api';

type NavId =
  | 'oportunidades'
  | 'qualidade'
  | 'ocupacao'
  | 'conversao'
  | 'destaque'
  | 'unidades';

type DesempenhoData = {
  periodo: { de: string; ate: string; mes: string };
  resumo: {
    unidadesTotal: number;
    unidadesPublicadas: number;
    reservas: number;
    receitaTotal: number;
    noitesReservadas: number;
    noitesDisponiveisEstimadas: number;
    ocupacaoPct: number | null;
  };
  qualidade: {
    scoreMedio: number | null;
    categorias: Array<{ id: string; label: string; pct: number }>;
    porUnidade: Array<{
      id: number;
      titulo: string;
      score: number;
      categorias: Array<{
        id: string;
        label: string;
        pct: number;
        checks: Array<{ id: string; ok: boolean; label: string }>;
      }>;
    }>;
    dicas: string[];
  };
  conversao: {
    reservas: number;
    unidadesAtivas: number;
    reservasPorUnidade: number | null;
    nota: string;
  };
  porUnidade: Array<{
    acomodacaoId: number;
    titulo: string;
    statusPublicacao: string;
    reservas: number;
    receita: number;
    noites: number;
  }>;
  oportunidades?: Array<{
    id: string;
    titulo: string;
    categoria: string;
    pct: number;
    done: boolean;
    ctaPath?: string;
    ctaLabel?: string;
    ctaUnitId?: number;
    ctaUnitTitulo?: string;
  }>;
  oportunidadesResumo?: {
    pendentes: number;
    concluidas: number;
    pctNaoConcluidas: number;
  };
  avaliacoesHospedes?: {
    disponivel: boolean;
    mediaGeral: number | null;
    totalAvaliacoes: number;
    porUnidade: Array<{
      acomodacaoId: number;
      titulo?: string;
      media: number | null;
      total: number;
    }>;
  };
};

type Opp = {
  id: string;
  titulo: string;
  categoria: string;
  pct: number;
  done?: boolean;
  ctaPath?: string;
  ctaLabel?: string;
  ctaUnitId?: number;
  ctaUnitTitulo?: string;
};

function formatBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function currentMes(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function AnfitriaoDesempenhoPage() {
  const [mes, setMes] = useState(currentMes);
  const [nav, setNav] = useState<NavId>('oportunidades');
  const [oppTab, setOppTab] = useState<'atraentes' | 'flexivel' | 'precos'>('atraentes');
  const [data, setData] = useState<DesempenhoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [nfseMsg, setNfseMsg] = useState<string | null>(null);
  const [nfseBusy, setNfseBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fase1Api.anfitriaoDesempenho(mes);
      setData(res.data);
    } catch (e) {
      setErro((e as Error).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [mes]);

  useEffect(() => {
    void load();
  }, [load]);

  const opps = useMemo<Opp[]>(() => data?.oportunidades ?? [], [data]);
  const pending = opps.filter((o) => !o.done);
  const done = opps.filter((o) => o.done);
  const pendingPct = data?.oportunidadesResumo?.pctNaoConcluidas ?? 0;
  const concluidasPct = Math.max(0, 100 - pendingPct);
  const oportunidadesPendentes = data?.oportunidadesResumo?.pendentes ?? pending.length;
  const oportunidadesConcluidas = data?.oportunidadesResumo?.concluidas ?? done.length;

  function downloadCsv() {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('access_token') || localStorage.getItem('token') || ''
        : '';
    const url = `${FASE1_API_BASE}/api/v1/acomodacoes/anfitriao/desempenho/relatorio.csv?mes=${encodeURIComponent(mes)}`;
    void fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async (r) => {
        if (!r.ok) throw new Error('Falha ao baixar CSV');
        const blob = await r.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `desempenho-rsv360-${mes}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch((e) => setErro((e as Error).message));
  }

  function downloadFiscalCsv() {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('access_token') || localStorage.getItem('token') || ''
        : '';
    const url = `${FASE1_API_BASE}/api/v1/acomodacoes/anfitriao/impostos/relatorio-mensal.csv?mes=${encodeURIComponent(mes)}`;
    void fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async (r) => {
        if (!r.ok) {
          const json = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(json.error || 'Falha ao baixar relatório fiscal');
        }
        const blob = await r.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `fiscal-mensal-rsv360-${mes}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch((e) => setErro((e as Error).message));
  }

  async function prepararNfseRascunhos() {
    if (!data?.porUnidade?.length) {
      setNfseMsg('Nenhuma unidade disponível para preparar NFSe neste mês.');
      return;
    }
    setNfseBusy(true);
    setNfseMsg(null);
    setErro(null);
    try {
      let ok = 0;
      let lastStatus = 'nfse_pending';
      for (const u of data.porUnidade) {
        const res = await fase1Api.anfitriaoPrepararNfse(u.acomodacaoId, mes);
        if (res.data?.status) lastStatus = res.data.status;
        ok += 1;
      }
      setNfseMsg(
        `${ok} rascunho(s) NFSe criado(s) com status ${lastStatus} — pendente, sem autorização municipal neste MVP.`,
      );
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setNfseBusy(false);
    }
  }

  const navItems: Array<{ id: NavId; label: string }> = [
    { id: 'oportunidades', label: 'Oportunidades' },
    { id: 'qualidade', label: 'Qualidade' },
    { id: 'ocupacao', label: 'Ocupação e taxas' },
    { id: 'conversao', label: 'Conversão' },
    { id: 'destaque', label: 'Anfitrião Destaque' },
    { id: 'unidades', label: 'Por unidade' },
  ];

  return (
    <AnfitriaoRoleGuard>
      <Head>
        <title>Desempenho | Reservei Viagens</title>
      </Head>
      <div className="min-h-screen bg-slate-50">
        <AnfitriaoHostNav />
        <div className="mx-auto flex max-w-7xl flex-col gap-0 lg:flex-row">
          <aside className="w-full border-b border-slate-200 bg-white lg:w-56 lg:border-b-0 lg:border-r">
            <div className="px-4 py-4">
              <h1 className="text-lg font-bold text-slate-900">Desempenho</h1>
            </div>
            <nav className="flex gap-1 overflow-x-auto px-2 pb-3 lg:flex-col lg:overflow-visible">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setNav(item.id)}
                  className={`shrink-0 rounded-lg px-3 py-2 text-left text-sm ${
                    nav === item.id
                      ? 'bg-slate-100 font-semibold text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          <main className="min-w-0 flex-1 px-4 py-6 md:px-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm text-slate-700">
                Mês
                <input
                  type="month"
                  className="ml-2 rounded-lg border border-slate-200 px-2 py-1.5"
                  value={mes}
                  onChange={(e) => setMes(e.target.value)}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={downloadCsv}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium"
                >
                  Baixar CSV
                </button>
                <button
                  type="button"
                  onClick={downloadFiscalCsv}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium"
                  title="Estimativa receita × alíquota do mês (não é NFSe)"
                >
                  Exportar fiscal do mês
                </button>
                <button
                  type="button"
                  onClick={() => void prepararNfseRascunhos()}
                  disabled={nfseBusy || loading}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium disabled:opacity-40"
                  title="Cria rascunho NFSe (nfse_pending) — sem autorização municipal"
                >
                  {nfseBusy ? 'Preparando NFSe…' : 'Preparar NFSe (rascunho)'}
                </button>
              </div>
            </div>

            {nfseMsg && <p className="mb-4 text-sm text-teal-800">{nfseMsg}</p>}
            {erro && <p className="mb-4 text-sm text-red-600">{erro}</p>}
            {loading && <p className="text-sm text-slate-600">Carregando métricas…</p>}

            {!loading && data && nav === 'oportunidades' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {pendingPct}% das suas oportunidades ainda não foram concluídas.
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {oportunidadesPendentes} pendente{oportunidadesPendentes === 1 ? '' : 's'} ·{' '}
                      {oportunidadesConcluidas} concluída{oportunidadesConcluidas === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="max-w-md rounded-2xl border bg-white p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800">Oportunidades concluídas</p>
                      <span className="text-sm font-bold text-slate-900">{concluidasPct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-teal-500 transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, concluidasPct))}%` }}
                      />
                    </div>
                  </div>
                  <div className="max-w-md rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-600">
                      Comparativo com outros anúncios ainda não está disponível neste painel.
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Os percentuais acima refletem apenas as ações sugeridas para os seus anúncios.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ['atraentes', 'Anúncios atraentes'],
                      ['flexivel', 'Reserva flexível'],
                      ['precos', 'Preços'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setOppTab(id)}
                      className={`rounded-full px-3 py-1.5 text-sm ${
                        oppTab === id ? 'bg-slate-900 text-white' : 'bg-white ring-1 ring-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <ul className="space-y-2">
                  {pending
                    .filter((o) => o.categoria === oppTab)
                    .map((o) => (
                      <li
                        key={o.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{o.titulo}</p>
                          <Link
                            href={o.ctaPath || '/anfitriao/unidades'}
                            className="text-xs text-slate-600 underline"
                            prefetch={false}
                          >
                            {o.ctaLabel || 'Abrir anúncio'}
                          </Link>
                          {o.ctaUnitTitulo && o.ctaLabel && (
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              Unidade sugerida para concluir esta ação
                            </p>
                          )}
                        </div>
                        <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-300 text-xs font-bold">
                          {o.pct}%
                        </span>
                      </li>
                    ))}
                </ul>

                <div>
                  <h3 className="mb-2 font-semibold text-slate-900">Ações concluídas</h3>
                  <ul className="space-y-2">
                    {done.map((o) => (
                      <li
                        key={o.id}
                        className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-4 py-2 text-sm text-slate-700"
                      >
                        <span className="text-teal-600">✓</span> {o.titulo}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {!loading && data && nav === 'qualidade' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold">Completude do anúncio</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Score baseado em metadados do anúncio — não substitui avaliações de hóspedes.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border bg-white p-4">
                    <p className="text-sm text-slate-500">Completude média</p>
                    <p className="mt-2 text-2xl font-bold">
                      {data.qualidade.scoreMedio != null ? `${data.qualidade.scoreMedio}%` : '—'}
                    </p>
                  </div>
                  {data.avaliacoesHospedes?.disponivel &&
                  (data.avaliacoesHospedes.totalAvaliacoes ?? 0) > 0 ? (
                    <div className="rounded-2xl border bg-white p-4">
                      <p className="text-sm text-slate-500">Avaliações de hóspedes</p>
                      <p className="mt-2 text-2xl font-bold">
                        {data.avaliacoesHospedes.mediaGeral != null
                          ? `${data.avaliacoesHospedes.mediaGeral}`
                          : '—'}
                        <span className="ml-1 text-base font-normal text-slate-500">/ 5</span>
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {data.avaliacoesHospedes.totalAvaliacoes} avaliação
                        {data.avaliacoesHospedes.totalAvaliacoes === 1 ? '' : 'ões'} no escopo do
                        anfitrião
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-600">
                        {data.avaliacoesHospedes?.disponivel
                          ? 'Ainda não há avaliações de hóspedes'
                          : 'Avaliações de hóspedes — ainda não disponíveis neste painel'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {data.avaliacoesHospedes?.disponivel
                          ? 'Quando hóspedes enviarem feedback após a estadia, a média aparecerá aqui.'
                          : 'Notas e comentários de estadia não estão integrados ao RSV360° nesta versão. A completude acima mede apenas metadados do anúncio.'}
                      </p>
                    </div>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {data.qualidade.categorias.map((cat) => (
                    <div key={cat.id} className="rounded-2xl border bg-white p-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-800">{cat.label}</p>
                        <span className="text-sm font-bold text-slate-900">{cat.pct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-teal-500 transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, cat.pct))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {data.qualidade.dicas.length > 0 && (
                  <ul className="space-y-2">
                    {data.qualidade.dicas.map((d) => (
                      <li key={d} className="rounded-xl border bg-white px-4 py-3 text-sm">
                        {d}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="overflow-x-auto rounded-2xl border bg-white">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b bg-slate-50">
                      <tr>
                        <th className="px-4 py-3">Anúncio</th>
                        <th className="px-4 py-3">Completude</th>
                        <th className="px-4 py-3">Categorias</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {data.qualidade.porUnidade.map((u) => (
                        <tr key={u.id} className="border-b last:border-0">
                          <td className="px-4 py-3 font-medium">{u.titulo}</td>
                          <td className="px-4 py-3">
                            <span className="font-semibold">{u.score}%</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {u.categorias.map((c) => (
                                <span
                                  key={c.id}
                                  title={c.label}
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                    c.pct >= 80
                                      ? 'bg-teal-50 text-teal-800'
                                      : c.pct >= 50
                                        ? 'bg-amber-50 text-amber-800'
                                        : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {c.pct}%
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/anfitriao/unidades/${u.id}`}
                              className="underline"
                              prefetch={false}
                            >
                              Editar
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!loading && data && nav === 'ocupacao' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold">Ocupação e taxas</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: 'Noites reservadas', value: String(data.resumo.noitesReservadas) },
                    {
                      label: 'Noites disponíveis (est.)',
                      value: String(data.resumo.noitesDisponiveisEstimadas),
                    },
                    {
                      label: 'Ocupação',
                      value:
                        data.resumo.ocupacaoPct != null ? `${data.resumo.ocupacaoPct}%` : '—',
                    },
                    { label: 'Receita', value: formatBRL(data.resumo.receitaTotal) },
                  ].map((c) => (
                    <div key={c.label} className="rounded-2xl border bg-white p-4">
                      <p className="text-sm text-slate-500">{c.label}</p>
                      <p className="mt-2 text-2xl font-bold">{c.value}</p>
                    </div>
                  ))}
                </div>
                <Link href="/anfitriao/calendario" className="text-sm underline" prefetch={false}>
                  Abrir calendário multi →
                </Link>
              </div>
            )}

            {!loading && data && nav === 'conversao' && (
              <div className="space-y-3">
                <h2 className="text-xl font-bold">Conversão</h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border bg-white p-4">
                    <p className="text-sm text-slate-500">Reservas</p>
                    <p className="mt-2 text-2xl font-bold">{data.conversao.reservas}</p>
                  </div>
                  <div className="rounded-2xl border bg-white p-4">
                    <p className="text-sm text-slate-500">Unidades ativas</p>
                    <p className="mt-2 text-2xl font-bold">{data.conversao.unidadesAtivas}</p>
                  </div>
                  <div className="rounded-2xl border bg-white p-4">
                    <p className="text-sm text-slate-500">Reservas / unidade</p>
                    <p className="mt-2 text-2xl font-bold">
                      {data.conversao.reservasPorUnidade ?? '—'}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-500">{data.conversao.nota}</p>
              </div>
            )}

            {!loading && data && nav === 'destaque' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold">Anfitrião Destaque</h2>
                <p className="text-sm text-slate-600">
                  Indicadores disponíveis hoje: completude do anúncio, volume de reservas, ocupação
                  {data.avaliacoesHospedes?.disponivel ? ' e avaliações de hóspedes' : ''}. Taxa de
                  resposta e cancelamentos do anfitrião ainda não entram neste painel.
                </p>
                <ul className="space-y-3">
                  {[
                    [
                      'Completude média do anúncio',
                      'Percentual de metadados preenchidos (não é nota de hóspedes)',
                      data.qualidade.scoreMedio != null ? `${data.qualidade.scoreMedio}%` : null,
                    ],
                    ...(data.avaliacoesHospedes?.disponivel &&
                    (data.avaliacoesHospedes.totalAvaliacoes ?? 0) > 0
                      ? [
                          [
                            'Média de avaliações de hóspedes',
                            'Nota geral agregada (sem nomes ou comentários)',
                            data.avaliacoesHospedes.mediaGeral != null
                              ? `${data.avaliacoesHospedes.mediaGeral} / 5`
                              : null,
                          ] as const,
                          [
                            'Total de avaliações',
                            'Feedback recebido no escopo das suas unidades',
                            data.avaliacoesHospedes.totalAvaliacoes,
                          ] as const,
                        ]
                      : []),
                    [
                      'Anúncios ≥ 80% completude',
                      'Unidades com cadastro quase completo',
                      data.qualidade.porUnidade.filter((u) => u.score >= 80).length,
                    ],
                    ['Reservas no período', 'Volume ativo no mês selecionado', data.resumo.reservas],
                    [
                      'Ocupação',
                      'Noites reservadas ÷ noites disponíveis (est.)',
                      data.resumo.ocupacaoPct != null ? `${data.resumo.ocupacaoPct}%` : null,
                    ],
                  ].map(([label, hint, val]) => (
                    <li key={String(label)} className="rounded-2xl border bg-white px-4 py-3">
                      <div className="flex justify-between gap-2">
                        <div>
                          <p className="font-semibold">{label}</p>
                          <p className="text-xs text-slate-500">{hint}</p>
                        </div>
                        <p className="font-bold">{val != null ? String(val) : '—'}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!loading && data && nav === 'unidades' && (
              <div className="overflow-x-auto rounded-2xl border bg-white">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b bg-slate-50">
                    <tr>
                      <th className="px-4 py-3">Unidade</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Reservas</th>
                      <th className="px-4 py-3">Receita</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.porUnidade.map((u) => (
                      <tr key={u.acomodacaoId} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">{u.titulo}</td>
                        <td className="px-4 py-3 capitalize">{u.statusPublicacao}</td>
                        <td className="px-4 py-3">{u.reservas}</td>
                        <td className="px-4 py-3">{formatBRL(u.receita)}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/anfitriao/unidades/${u.acomodacaoId}`}
                            className="underline"
                            prefetch={false}
                          >
                            Editor
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </main>
        </div>
      </div>
    </AnfitriaoRoleGuard>
  );
}
