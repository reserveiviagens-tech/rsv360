'use client';

import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { format, addDays } from 'date-fns';
import { useRouter } from 'next/router';
import AnfitriaoRoleGuard from '../../components/AnfitriaoRoleGuard';
import { AnfitriaoHostNav } from '../../components/anfitriao/AnfitriaoHostNav';
import {
  useAnfitriaoInbox,
  useAnfitriaoMensagensThread,
  useEnviarMensagemAnfitriao,
} from '@/hooks/useAnfitriao';
import { useQueryClient } from '@tanstack/react-query';

type InboxRow = {
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
  unread: boolean;
  lastMessage: {
    id: number;
    senderType: string;
    preview: string;
    createdAt: string | null;
  } | null;
};

function isHostSender(type: string): boolean {
  return type === 'anfitriao' || type === 'host' || type === 'agent' || type === 'system';
}

export default function AnfitriaoMensagensPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const de = useMemo(() => format(addDays(new Date(), -90), 'yyyy-MM-dd'), []);
  const ate = useMemo(() => format(addDays(new Date(), 180), 'yyyy-MM-dd'), []);
  const { data, isLoading, refetch } = useAnfitriaoInbox(de, ate, { pollMs: 15_000 });
  const rows = (data?.data ?? []) as InboxRow[];
  const [filtro, setFiltro] = useState<'todas' | 'nao-lidas'>('todas');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [sendErr, setSendErr] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query.propostaId;
    if (typeof q === 'string' && Number.isFinite(Number(q))) {
      setSelectedId(Number(q));
    }
  }, [router.isReady, router.query.propostaId]);

  useEffect(() => {
    if (selectedId == null && rows.length > 0) {
      setSelectedId(rows[0].propostaId);
    }
  }, [rows, selectedId]);

  const unreadTotal = rows.filter((r) => r.unread).length;
  const filtered =
    filtro === 'nao-lidas' ? rows.filter((r) => r.unread) : rows;
  const selected = rows.find((r) => r.propostaId === selectedId) ?? null;

  const {
    data: threadRes,
    isLoading: loadingThread,
    refetch: refetchThread,
    isSuccess: threadOk,
  } = useAnfitriaoMensagensThread(selectedId, { pollMs: 12_000 });
  const messages = threadRes?.data?.messages ?? [];
  const enviar = useEnviarMensagemAnfitriao(selectedId);

  useEffect(() => {
    if (threadOk && selectedId != null) {
      void refetch();
      void qc.invalidateQueries({ queryKey: ['anfitriao', 'unread-count'] });
    }
  }, [threadOk, selectedId, refetch, qc]);

  async function onSend() {
    if (!selectedId || !draft.trim()) return;
    setSendErr(null);
    try {
      await enviar.mutateAsync(draft.trim());
      setDraft('');
      await Promise.all([refetchThread(), refetch()]);
    } catch (e) {
      setSendErr((e as Error).message);
    }
  }

  return (
    <AnfitriaoRoleGuard>
      <Head>
        <title>Mensagens | Anfitrião Reservei</title>
      </Head>
      <div className="min-h-screen bg-slate-50">
        <AnfitriaoHostNav />
        <div className="mx-auto grid max-w-7xl gap-0 lg:grid-cols-[280px_1fr_300px]">
          <aside className="border-r border-slate-200 bg-white">
            <div className="flex items-center justify-between px-4 py-3">
              <h1 className="text-lg font-bold">Mensagens</h1>
            </div>
            <div className="flex gap-2 px-4 pb-3">
              {(
                [
                  ['todas', 'Todas'],
                  ['nao-lidas', 'Não lidas'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFiltro(id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ${
                    filtro === id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {label}
                  {id === 'nao-lidas' && unreadTotal > 0 ? (
                    <span
                      className={`rounded-full px-1.5 text-[10px] font-semibold ${
                        filtro === id ? 'bg-white/20 text-white' : 'bg-teal-600 text-white'
                      }`}
                    >
                      {unreadTotal}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
            {isLoading && <p className="px-4 text-sm text-slate-500">Carregando…</p>}
            {!isLoading && filtered.length === 0 && (
              <p className="px-4 py-8 text-sm text-slate-500">Nenhuma conversa ainda.</p>
            )}
            <ul className="max-h-[70vh] overflow-y-auto">
              {filtered.map((r) => (
                <li key={r.propostaId}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(r.propostaId)}
                    className={`w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 ${
                      selected?.propostaId === r.propostaId ? 'bg-slate-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">
                        {r.clienteNome || 'Hóspede'}
                      </p>
                      {r.unread && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-teal-500" aria-label="Não lida" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {r.codigo || `#${r.propostaId}`} · {r.checkIn} → {r.checkOut}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-600">
                      {r.lastMessage?.preview || r.titulo || r.status}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <section className="flex min-h-[60vh] flex-col bg-white">
            {selected ? (
              <>
                <div className="border-b border-slate-200 px-4 py-3">
                  <p className="font-semibold">{selected.clienteNome || 'Hóspede'}</p>
                  <p className="text-xs text-slate-500">
                    {selected.titulo} · {selected.checkIn} → {selected.checkOut}
                  </p>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                  {loadingThread && <p className="text-sm text-slate-500">Carregando mensagens…</p>}
                  {!loadingThread && messages.length === 0 && (
                    <p className="text-sm text-slate-500">
                      Nenhuma mensagem ainda. Envie a primeira ao hóspede.
                    </p>
                  )}
                  {messages.map((m) => {
                    const mine = isHostSender(m.senderType);
                    return (
                      <div
                        key={m.id}
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                          mine
                            ? 'ml-auto bg-slate-800 text-white'
                            : 'bg-slate-100 text-slate-900'
                        }`}
                      >
                        {!mine && m.senderName && (
                          <p className="mb-0.5 text-[10px] font-medium text-slate-500">
                            {m.senderName}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap">{m.message}</p>
                        {m.createdAt && (
                          <p
                            className={`mt-1 text-[10px] ${
                              mine ? 'text-slate-300' : 'text-slate-400'
                            }`}
                          >
                            {new Date(m.createdAt).toLocaleString('pt-BR')}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-slate-200 p-3">
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm"
                      placeholder="Escreva uma mensagem…"
                      value={draft}
                      maxLength={2000}
                      disabled={enviar.isPending}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void onSend();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                      disabled={enviar.isPending || !draft.trim()}
                      onClick={() => void onSend()}
                    >
                      Enviar
                    </button>
                  </div>
                  {sendErr && <p className="mt-1 text-xs text-red-600">{sendErr}</p>}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
                Selecione uma conversa
              </div>
            )}
          </section>

          <aside className="hidden border-l border-slate-200 bg-white lg:block">
            <div className="px-4 py-3">
              <h2 className="font-semibold">Reserva</h2>
            </div>
            {selected ? (
              <div className="space-y-3 px-4 text-sm">
                <p>
                  <span className="text-slate-500">Hóspede:</span> {selected.clienteNome}
                </p>
                <p>
                  <span className="text-slate-500">Contato:</span>{' '}
                  {selected.clienteEmail || selected.clienteTelefone || '—'}
                </p>
                <p>
                  <span className="text-slate-500">Status:</span> {selected.status || '—'}
                </p>
                <p>
                  <span className="text-slate-500">Check-in:</span> {selected.checkIn}
                </p>
                <p>
                  <span className="text-slate-500">Checkout:</span> {selected.checkOut}
                </p>
                <p>
                  <span className="text-slate-500">Total:</span>{' '}
                  {Number(selected.valorTotal).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </p>
                <Link
                  href={`/anfitriao/unidades/${selected.acomodacaoId}/disponibilidade`}
                  className="inline-block text-slate-800 underline"
                  prefetch={false}
                >
                  Mostrar calendário
                </Link>
              </div>
            ) : (
              <p className="px-4 text-sm text-slate-500">Sem reserva selecionada.</p>
            )}
          </aside>
        </div>
      </div>
    </AnfitriaoRoleGuard>
  );
}
