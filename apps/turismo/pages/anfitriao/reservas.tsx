'use client';

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AnfitriaoRoleGuard from '../../components/AnfitriaoRoleGuard';
import { AnfitriaoHostNav } from '../../components/anfitriao/AnfitriaoHostNav';
import { useAnfitriaoReservas, useDecidirPedidoReserva } from '@/hooks/useAnfitriao';

interface ReservaItem {
  propostaId: number;
  codigo: string | null;
  titulo: string;
  status: string;
  acomodacaoId: number;
  checkIn: string;
  checkOut: string;
  valorTotal: string;
  clienteNome: string;
  clienteEmail: string | null;
  clienteTelefone: string | null;
  aceitoEm: string | null;
}

function statusLabel(status: string): string {
  if (status === 'pending_host') return 'Aguardando você';
  if (status === 'accepted') return 'Confirmada';
  if (status === 'paid') return 'Paga';
  if (status === 'rejected') return 'Recusada';
  return status;
}

export default function AnfitriaoReservasPage() {
  const [de, setDe] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [ate, setAte] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 2);
    return d.toISOString().slice(0, 10);
  });
  const { data, isLoading, isError, error, refetch, isFetching } = useAnfitriaoReservas(de, ate);
  const decidir = useDecidirPedidoReserva();
  const items = (data?.data ?? []) as ReservaItem[];
  const loading = isLoading || isFetching;
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function onDecidir(propostaId: number, action: 'aprovar' | 'rejeitar') {
    setActionError(null);
    setBusyId(propostaId);
    try {
      await decidir.mutateAsync({ propostaId, action });
      await refetch();
    } catch (e) {
      setActionError((e as Error).message || 'Não foi possível atualizar o pedido');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AnfitriaoRoleGuard>
      <Head>
        <title>Reservas | Anfitrião</title>
      </Head>
      <div className="min-h-screen bg-slate-50">
        <AnfitriaoHostNav />
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
          <h1 className="text-2xl font-bold">Reservas</h1>
          <p className="mt-1 text-sm text-slate-600">
            Propostas no seu escopo. Contato mascarado (LGPD). Pedidos com modo “aprovar”
            aparecem como aguardando você.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <label className="text-sm">
              De
              <input
                type="date"
                className="ml-2 rounded border px-2 py-1"
                value={de}
                onChange={(e) => setDe(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Até
              <input
                type="date"
                className="ml-2 rounded border px-2 py-1"
                value={ate}
                onChange={(e) => setAte(e.target.value)}
              />
            </label>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={loading}
              className="rounded bg-slate-800 px-3 py-1 text-sm text-white"
            >
              Atualizar
            </button>
          </div>

          {isError && (
            <p className="mt-4 text-sm text-red-600">
              {(error as Error)?.message || 'Erro ao carregar reservas'}
            </p>
          )}
          {actionError && <p className="mt-2 text-sm text-red-600">{actionError}</p>}

          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Proposta</th>
                  <th className="px-4 py-3">Unidade</th>
                  <th className="px-4 py-3">Check-in / out</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      {loading ? 'Carregando…' : 'Nenhuma reserva no período.'}
                    </td>
                  </tr>
                ) : (
                  items.map((r) => (
                    <tr key={r.propostaId} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.codigo ?? `#${r.propostaId}`}</div>
                        <div className="text-xs text-slate-500">{r.titulo}</div>
                      </td>
                      <td className="px-4 py-3">#{r.acomodacaoId}</td>
                      <td className="px-4 py-3">
                        {r.checkIn} → {r.checkOut}
                      </td>
                      <td className="px-4 py-3">
                        <div>{r.clienteNome}</div>
                        <div className="text-xs text-slate-500">{r.clienteEmail ?? '—'}</div>
                        <div className="text-xs text-slate-500">{r.clienteTelefone ?? '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            r.status === 'pending_host'
                              ? 'rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900'
                              : 'capitalize'
                          }
                        >
                          {statusLabel(r.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">R$ {r.valorTotal}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/anfitriao/mensagens?propostaId=${r.propostaId}`}
                            className="text-xs font-medium text-slate-700 underline"
                          >
                            Mensagens
                          </Link>
                          {r.status === 'pending_host' && (
                            <>
                              <button
                                type="button"
                                disabled={busyId === r.propostaId}
                                onClick={() => void onDecidir(r.propostaId, 'aprovar')}
                                className="rounded bg-emerald-700 px-2 py-1 text-xs text-white disabled:opacity-50"
                              >
                                Aprovar
                              </button>
                              <button
                                type="button"
                                disabled={busyId === r.propostaId}
                                onClick={() => void onDecidir(r.propostaId, 'rejeitar')}
                                className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 disabled:opacity-50"
                              >
                                Recusar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AnfitriaoRoleGuard>
  );
}
