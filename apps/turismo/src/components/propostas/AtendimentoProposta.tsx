'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import {
  useProposta,
  usePropostaHitl,
  useReleaseHitl,
  useTakeoverHitl,
} from '@/hooks/useFase1Modules';
import { getWsBaseUrl } from '@/lib/fase1-api';
import type { PropostaChatMessage } from '@rsv360/shared';

export function AtendimentoProposta({ propostaId }: { propostaId: number }) {
  const { data: propostaRes } = useProposta(propostaId);
  const { data: hitlRes } = usePropostaHitl(propostaId);
  const takeover = useTakeoverHitl();
  const release = useReleaseHitl();

  const [messages, setMessages] = useState<PropostaChatMessage[]>([]);
  const [text, setText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const proposta = propostaRes?.data;
  const hitl = hitlRes?.data;
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || '' : '';

  useEffect(() => {
    const socket = io(`${getWsBaseUrl()}/propostas`, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    const emitJoin = () => {
      socket.emit('join', { propostaId, token: token || undefined });
    };

    if (socket.connected) {
      emitJoin();
    } else {
      socket.on('connect', emitJoin);
    }

    socket.on('joined', (payload: { history?: PropostaChatMessage[] }) => {
      if (payload.history) setMessages(payload.history);
    });

    socket.on('chat:message', (payload: { message: PropostaChatMessage }) => {
      setErrorMsg(null);
      setMessages((prev) =>
        prev.some((m) => m.id === payload.message.id) ? prev : [...prev, payload.message],
      );
    });

    socket.on('error', (err: { message?: string }) => {
      if (err?.message) setErrorMsg(err.message);
    });

    return () => {
      socket.off('connect', emitJoin);
      socket.disconnect();
    };
  }, [propostaId, token]);

  const sendAgentMessage = () => {
    if (!text.trim()) return;
    const trimmed = text.trim();
    setText('');
    setErrorMsg(null);

    const optimisticMsg = {
      id: `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      propostaId,
      senderType: 'agent',
      senderName: 'Consultor',
      message: trimmed,
      createdAt: new Date().toISOString(),
    } as unknown as PropostaChatMessage;

    setMessages((prev) => [...prev, optimisticMsg]);

    socketRef.current?.emit('chat:message', {
      propostaId,
      message: trimmed,
      senderType: 'agent',
      token,
    });
  };

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-slate-200 bg-white p-5">
        <h1 className="text-xl font-bold">Atendimento — {proposta?.titulo ?? `#${propostaId}`}</h1>
        <p className="text-sm text-slate-600">{proposta?.clienteNome}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              hitl?.hitlMode === 'human'
                ? 'bg-emerald-100 text-emerald-800'
                : hitl?.hitlMode === 'waiting'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-700'
            }`}
          >
            HITL: {hitl?.hitlMode ?? 'ai'}
            {hitl?.assignedAgentName ? ` — ${hitl.assignedAgentName}` : ''}
          </span>
          {hitl?.hitlMode !== 'human' && (
            <button
              type="button"
              onClick={() => takeover.mutate(propostaId)}
              disabled={takeover.isPending}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white"
            >
              Assumir chat
            </button>
          )}
          {hitl?.hitlMode === 'human' && (
            <button
              type="button"
              onClick={() => release.mutate(propostaId)}
              disabled={release.isPending}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              Devolver à IA
            </button>
          )}
        </div>
      </header>

      {errorMsg && (
        <p className="mt-2 text-xs text-red-600 text-center">{errorMsg}</p>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 max-h-96 space-y-2 overflow-y-auto rounded-lg bg-slate-50 p-4">
          {messages.map((msg) => (
            <div key={msg.id} className="rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
              <p className="text-xs font-medium text-slate-500">{msg.senderName ?? msg.senderType}</p>
              <p>{msg.message}</p>
            </div>
          ))}
        </div>
        {hitl?.hitlMode === 'human' && (
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendAgentMessage()}
              placeholder="Resposta do consultor..."
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button type="button" onClick={sendAgentMessage} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
              Enviar
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
