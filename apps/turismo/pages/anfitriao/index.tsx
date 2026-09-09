import Link from 'next/link';
import Head from 'next/head';
import { useState } from 'react';
import AnfitriaoRoleGuard from '../../components/AnfitriaoRoleGuard';
import { AnfitriaoHostNav } from '../../components/anfitriao/AnfitriaoHostNav';
import { useAnfitriaoDashboard, useAnfitriaoHoje } from '@/hooks/useAnfitriao';

type ReservaCard = {
  propostaId: number;
  checkIn: string;
  checkOut: string;
  titulo?: string | null;
  clienteNome?: string | null;
  status?: string | null;
  acomodacaoId?: number;
  valorTotal?: string | null;
  codigo?: string | null;
};

function ReservaList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: ReservaCard[];
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="font-semibold text-slate-900">
          {title}{' '}
          <span className="text-sm font-normal text-slate-500">({items.length})</span>
        </h2>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((r) => (
            <li key={r.propostaId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {r.clienteNome || 'Hóspede'} · {r.codigo || `#${r.propostaId}`}
                </p>
                <p className="text-xs text-slate-500">
                  {r.titulo || `Unidade #${r.acomodacaoId}`} · {r.checkIn} → {r.checkOut}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/anfitriao/mensagens?propostaId=${r.propostaId}`}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-800"
                  prefetch={false}
                >
                  Mensagem
                </Link>
                {r.acomodacaoId != null && (
                  <Link
                    href={`/anfitriao/unidades/${r.acomodacaoId}/disponibilidade`}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700"
                    prefetch={false}
                  >
                    Calendário
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function AnfitriaoDashboardPage() {
  const { data: dash, isLoading: loadingKpis } = useAnfitriaoDashboard();
  const kpis = dash?.data;
  const [sub, setSub] = useState<'hoje' | 'proximos'>('hoje');
  const { data: agendaRes, isLoading: loadingAgenda, isError, error } = useAnfitriaoHoje();
  const agenda = agendaRes?.data;

  const checkIns = (agenda?.checkIns ?? []) as ReservaCard[];
  const checkOuts = (agenda?.checkOuts ?? []) as ReservaCard[];
  const hospedados = (agenda?.hospedados ?? []) as ReservaCard[];
  const proximos = (agenda?.proximos ?? []) as ReservaCard[];
  const semMovimentoHoje =
    checkIns.length === 0 && checkOuts.length === 0 && hospedados.length === 0;

  return (
    <AnfitriaoRoleGuard>
      <Head>
        <title>Hoje | Anfitrião Reservei</title>
      </Head>
      <div className="min-h-screen bg-slate-50">
        <AnfitriaoHostNav />
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Hoje</h1>
              <p className="text-sm text-slate-600">
                Check-ins, check-outs e próximos 14 dias
                {agenda?.hoje ? ` · ${agenda.hoje}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/anfitriao/reservas"
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Todas as reservas
              </Link>
              <Link
                href="/anfitriao/mensagens"
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800"
              >
                Mensagens
              </Link>
              <Link
                href="/anfitriao/desempenho"
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800"
              >
                Desempenho
              </Link>
            </div>
          </div>

          <div className="mb-6 flex gap-2">
            {(
              [
                ['hoje', 'Hoje'],
                ['proximos', 'Próximos'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setSub(id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                  sub === id ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {label}
                {id === 'proximos' && proximos.length > 0 ? ` (${proximos.length})` : ''}
              </button>
            ))}
          </div>

          {isError && (
            <p className="mb-4 text-sm text-red-600">{(error as Error)?.message || 'Erro ao carregar'}</p>
          )}
          {loadingAgenda && <p className="mb-4 text-sm text-slate-600">Carregando agenda…</p>}

          {sub === 'hoje' && (
            <div className="mb-8 space-y-4">
              {semMovimentoHoje && !loadingAgenda && (
                <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center">
                  <p className="text-xl font-semibold text-slate-900">Nada agendado para hoje</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Sem check-ins, check-outs ou hóspedes no imóvel neste dia.
                  </p>
                  <Link
                    href="/anfitriao/reservas"
                    className="mt-3 inline-block text-sm font-medium text-slate-700 underline"
                    prefetch={false}
                  >
                    Ver todas as reservas
                  </Link>
                </div>
              )}
              <ReservaList
                title="Check-ins hoje"
                empty="Nenhum check-in hoje."
                items={checkIns}
              />
              <ReservaList
                title="Check-outs hoje"
                empty="Nenhum check-out hoje."
                items={checkOuts}
              />
              <ReservaList
                title="Hóspedes no imóvel"
                empty="Ninguém hospedado no momento."
                items={hospedados}
              />
            </div>
          )}

          {sub === 'proximos' && (
            <div className="mb-8">
              <ReservaList
                title={`Próximos check-ins (até ${agenda?.proximosAte ?? '—'})`}
                empty="Nenhum check-in nos próximos 14 dias."
                items={proximos}
              />
            </div>
          )}

          {loadingKpis && <p className="text-slate-600">Carregando KPIs...</p>}

          {kpis && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Total', value: kpis.total },
                { label: 'Incompletas', value: kpis.incompletas },
                { label: 'Em aprovação', value: kpis.emAprovacao },
                { label: 'Publicadas', value: kpis.publicadas },
              ].map((card) => (
                <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-5">
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{card.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AnfitriaoRoleGuard>
  );
}
