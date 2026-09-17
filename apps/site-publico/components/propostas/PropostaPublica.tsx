'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io, type Socket } from 'socket.io-client';
import {
  useAceitarPropostaPublica,
  useEnviarChatProposta,
  usePropostaByToken,
  usePropostaChat,
  usePropostaHitl,
  usePropostaPublica,
  useResponderProposta,
  useSolicitarHitl,
  getPropostaWsUrl,
} from '@/hooks/usePropostas';
import {
  propostaAceiteBloqueado,
  useRoteiroValidade,
} from '@/hooks/useRoteiroValidade';
import { MgmTracker } from '@/components/propostas/MgmTracker';
import { PropostaExpiradaPanel } from '@/components/propostas/PropostaExpiradaPanel';
import { UrgenciaValidade } from '@/components/propostas/UrgenciaValidade';
import { TurnstileWidget } from '@/components/security/TurnstileWidget';
import { buildConsultorWhatsAppUrl } from '@/lib/proposta-consultor';
import { buildRecotacaoUrlFromProposta } from '@/lib/proposta-recotacao-url';
import { useCinematicTelemetry } from '@/hooks/useCinematicTelemetry';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import type { PropostaChatMessage } from '@/lib/fase1-types';

function formatCurrency(value: string | number, moeda = 'BRL') {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda }).format(num || 0);
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    draft: 'Rascunho',
    sent: 'Enviada',
    pending: 'Aguardando',
    accepted: 'Aceita',
    rejected: 'Recusada',
    cancelled: 'Cancelada',
    expired: 'Expirada',
  };
  return map[status] ?? status;
}

export function PropostaPublica({
  propostaId,
  publicToken,
}: {
  propostaId: number;
  publicToken?: string;
}) {
  const router = useRouter();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [guestName, setGuestName] = useState('');
  const [message, setMessage] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [liveMessages, setLiveMessages] = useState<PropostaChatMessage[]>([]);
  const [exibirComparativo, setExibirComparativo] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const tokenQuery = usePropostaByToken(publicToken);
  const idQuery = usePropostaPublica(publicToken ? undefined : propostaId);
  const { data: propostaRes, isLoading, error } = publicToken
    ? tokenQuery
    : idQuery;
  const { data: chatRes } = usePropostaChat(propostaId, publicToken);
  const { data: hitlRes } = usePropostaHitl(propostaId, publicToken);
  const responder = useResponderProposta();
  const aceitarPublico = useAceitarPropostaPublica();
  const enviarChat = useEnviarChatProposta();
  const solicitarHitl = useSolicitarHitl();

  const proposta = propostaRes?.data;
  const payloadReduzido = Boolean(
    (proposta as { payloadReduzido?: boolean } | undefined)?.payloadReduzido,
  );
  const hitl = hitlRes?.data;
  const roteiroToken = publicToken ?? null;

  useCinematicTelemetry(roteiroToken);

  const {
    restanteMs,
    expirada: validadeExpirada,
    validoAte,
    urgenciaEstilo,
    loading: validadeLoading,
    markExpirada,
  } = useRoteiroValidade(roteiroToken ?? '', { fallbackPollIntervalMs: 30_000 });

  const markExpiradaRef = useRef(markExpirada);
  markExpiradaRef.current = markExpirada;

  const expirada =
    payloadReduzido || validadeExpirada || proposta?.status === 'expired';
  const aceiteBloqueado = propostaAceiteBloqueado(proposta?.status, expirada);
  const canRespond = Boolean(proposta) && !aceiteBloqueado;
  const roteiroHref = roteiroToken ? `/roteiro/${roteiroToken}` : null;
  const isRoteiroReady = proposta && ['accepted', 'paid'].includes(proposta.status);
  const consultorWhatsAppUrl =
    (proposta as { whatsappUrl?: string } | undefined)?.whatsappUrl ??
    (proposta && roteiroToken
      ? buildConsultorWhatsAppUrl(proposta.titulo, roteiroToken)
      : 'https://wa.me/5564999999999');
  const recotacaoUrl =
    (proposta as { recotacaoUrl?: string } | undefined)?.recotacaoUrl ??
    buildRecotacaoUrlFromProposta({
      tokenPublico: roteiroToken,
      metadata: (proposta as { metadata?: Record<string, unknown> } | undefined)?.metadata,
      conteudo: proposta?.conteudo as Record<string, unknown> | null | undefined,
    });

  useEffect(() => {
    if (!isRoteiroReady || !roteiroHref) return;
    router.replace(roteiroHref);
  }, [isRoteiroReady, roteiroHref, router]);

  const handleAccept = async () => {
    if (aceiteBloqueado) return;
    const clientName = guestName || proposta?.clienteNome;
    if (!roteiroToken) {
      // Aceite público só via capability token (PR-03b)
      return;
    }
    const result = await aceitarPublico.mutateAsync({
      token: roteiroToken,
      clientName,
      turnstileToken: turnstileToken || undefined,
    });
    const destino = result.data?.proximoDestino ?? `/roteiro/${roteiroToken}`;
    router.push(destino);
  };

  const handleReject = () => {
    if (aceiteBloqueado || !roteiroToken) return;
    return responder.mutateAsync({
      id: propostaId,
      action: 'reject',
      clientName: guestName || proposta?.clienteNome,
      turnstileToken: turnstileToken || undefined,
      tokenPublico: roteiroToken,
    });
  };

  const acceptPending = aceitarPublico.isPending || responder.isPending;
  const comparativo = (proposta?.comparativoCache ?? []) as Array<{
    titulo: string;
    preco: number;
    fornecedor: string;
    fonte?: string;
  }>;

  useEffect(() => {
    if (proposta?.exibirComparativo) setExibirComparativo(true);
  }, [proposta?.exibirComparativo]);

  useEffect(() => {
    if (!propostaId) return;
    void fetch(`/api/propostas/${propostaId}/visualizacao`, { method: 'POST' }).catch(() => undefined);
  }, [propostaId]);

  useEffect(() => {
    if (chatRes?.data) setLiveMessages(chatRes.data);
  }, [chatRes?.data]);

  useEffect(() => {
    const wsBase = getPropostaWsUrl();
    const socket = io(`${wsBase}/propostas`, { path: '/socket.io', transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.emit('join', {
      propostaId,
      tokenPublico: roteiroToken ?? undefined,
      guestName: guestName || undefined,
    });

    socket.on('joined', (payload: { history?: PropostaChatMessage[] }) => {
      if (payload.history?.length) setLiveMessages(payload.history);
    });

    socket.on('chat:message', (payload: { message: PropostaChatMessage }) => {
      setLiveMessages((prev) => {
        if (prev.some((m) => m.id === payload.message.id)) return prev;
        return [...prev, payload.message];
      });
    });

    socket.on('comparativo:revelado', () => {
      setExibirComparativo(true);
    });

    const onExpirada = (payload: { token?: string }) => {
      if (roteiroToken && payload?.token && payload.token !== roteiroToken) return;
      markExpiradaRef.current();
    };

    socket.on('proposta:expirada', onExpirada);

    return () => {
      socket.off('proposta:expirada', onExpirada);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [propostaId, guestName, roteiroToken]);

  const handleSend = async () => {
    if (!message.trim()) return;
    const text = message.trim();
    setMessage('');

    try {
      const saved = await enviarChat.mutateAsync({
        id: propostaId,
        message: text,
        senderName: guestName || 'Visitante',
        turnstileToken: turnstileToken || undefined,
        tokenPublico: roteiroToken || undefined,
      });
      if (saved?.data) {
        setLiveMessages((prev) =>
          prev.some((m) => m.id === saved.data.id) ? prev : [...prev, saved.data],
        );
      }
    } catch {
      socketRef.current?.emit('chat:message', {
        propostaId,
        message: text,
        senderName: guestName || 'Visitante',
        senderType: 'client',
      });
    }
  };

  const mgmTracker = (
    <Suspense fallback={null}>
      <MgmTracker publicToken={publicToken} />
    </Suspense>
  );

  if (isLoading) {
    return (
      <>
        {mgmTracker}
        <div className="p-8 text-center text-slate-600">Carregando proposta...</div>
      </>
    );
  }

  if (error || !proposta) {
    return (
      <>
        {mgmTracker}
        <div className="mx-auto max-w-lg p-8 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Proposta não encontrada</h1>
          <p className="mt-2 text-slate-600">{(error as Error)?.message ?? 'Link inválido ou expirado.'}</p>
        </div>
      </>
    );
  }

  const conteudo = (proposta.conteudo ?? {}) as Record<string, unknown>;
  const itens = payloadReduzido
    ? []
    : ((conteudo.itens as Array<Record<string, unknown>>) ?? []);
  const tituloExibicao =
    (proposta as { tituloResumo?: string }).tituloResumo ?? proposta.titulo;

  return (
    <>
      {mgmTracker}
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-blue-600">Proposta comercial</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{tituloExibicao}</h1>
        <p className="mt-2 text-slate-600">
          Olá, <strong>{proposta.clienteNome}</strong>
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium">{statusLabel(proposta.status)}</span>
          {!payloadReduzido && proposta.valorTotal != null ? (
            <span className="font-semibold text-emerald-700">
              {formatCurrency(proposta.valorTotal, proposta.moeda)}
            </span>
          ) : null}
          {roteiroToken && !payloadReduzido ? (
            <UrgenciaValidade
              urgenciaEstilo={urgenciaEstilo}
              restanteMs={restanteMs}
              validoAte={validoAte ?? proposta.validoAte ?? null}
              expirada={expirada}
              loading={validadeLoading}
              prefersReducedMotion={prefersReducedMotion}
            />
          ) : (
            proposta.validoAte && (
              <span className="text-slate-500">
                Válida até {new Date(proposta.validoAte).toLocaleDateString('pt-BR')}
              </span>
            )
          )}
        </div>
      </header>

      {expirada && (
        <PropostaExpiradaPanel whatsappUrl={consultorWhatsAppUrl} recotacaoUrl={recotacaoUrl} />
      )}

      {itens.length > 0 && (
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">Itens incluídos</h2>
          <ul className="space-y-2">
            {itens.map((item, i) => (
              <li key={i} className="flex justify-between border-b border-slate-100 py-2 text-sm">
                <span>
                  {String(item.descricao ?? item.nome ?? `Item ${i + 1}`)}
                  {item.categoria === 'taxa_hospede' && proposta.metadata && typeof proposta.metadata === 'object' ? (
                    <span
                      className="ml-1 text-slate-400"
                      title={String((proposta.metadata as Record<string, unknown>).taxaHospedeDescricao ?? '')}
                    >
                      ⓘ
                    </span>
                  ) : null}
                </span>
                {(item.valor != null || item.precoTotal != null) && (
                  <span>{formatCurrency(String(item.valor ?? item.precoTotal), proposta.moeda)}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {exibirComparativo && comparativo.length > 0 && (
        <section
          className={
            prefersReducedMotion
              ? 'mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-6'
              : 'mb-8 animate-in fade-in slide-in-from-bottom-2 rounded-2xl border border-amber-200 bg-amber-50 p-6 duration-500'
          }
        >
          <h2 className="mb-2 text-lg font-semibold text-amber-900">Referências de mercado</h2>
          <p className="mb-4 text-sm text-amber-800">
            Valores de referência coletados em fontes públicas — apenas para comparação.
          </p>
          <ul className="space-y-3">
            {comparativo.map((o, i) => (
              <li key={i} className="flex items-center justify-between rounded-lg bg-white px-4 py-3 text-sm shadow-sm">
                <div>
                  <p className="font-medium text-slate-900">{o.titulo}</p>
                  <p className="text-xs text-slate-500">{o.fornecedor}</p>
                </div>
                <span className="font-semibold text-slate-700">{formatCurrency(o.preco, proposta.moeda)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isRoteiroReady && roteiroHref && (
        <section className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="text-sm text-emerald-800">Sua proposta foi aceita. Redirecionando para o roteiro premium…</p>
          <a href={roteiroHref} className="mt-3 inline-block text-sm font-medium text-emerald-700 underline">
            Abrir roteiro cinematográfico
          </a>
        </section>
      )}

      {canRespond && (
        <section className="mb-8 space-y-3">
          <TurnstileWidget onToken={setTurnstileToken} onExpire={() => setTurnstileToken('')} />
          <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Seu nome (opcional)"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={acceptPending || aceiteBloqueado}
            onClick={() => void handleAccept()}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Aceitar proposta
          </button>
          <button
            type="button"
            disabled={responder.isPending || aceiteBloqueado}
            onClick={() => void handleReject()}
            className="rounded-lg border border-red-300 px-5 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Recusar
          </button>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Chat com consultor</h2>
          {hitl?.hitlMode === 'ai' && (
            <button
              type="button"
              onClick={() =>
                solicitarHitl.mutate({
                  id: propostaId,
                  clientName: guestName || proposta.clienteNome,
                  tokenPublico: roteiroToken || undefined,
                })
              }
              className="text-sm text-blue-600 hover:underline"
            >
              Falar com humano
            </button>
          )}
          {hitl?.hitlMode === 'waiting' && (
            <span className="text-sm text-amber-600">Aguardando consultor...</span>
          )}
          {hitl?.hitlMode === 'human' && hitl.assignedAgentName && (
            <span className="text-sm text-emerald-600">Atendido por {hitl.assignedAgentName}</span>
          )}
        </div>

        <div className="mb-4 max-h-72 space-y-2 overflow-y-auto rounded-lg bg-slate-50 p-4">
          {liveMessages.length === 0 && (
            <p className="text-center text-sm text-slate-500">Envie uma mensagem para tirar dúvidas.</p>
          )}
          {liveMessages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-lg px-3 py-2 text-sm ${
                msg.senderType === 'client' ? 'ml-8 bg-blue-100 text-blue-900' : 'mr-8 bg-white text-slate-800'
              }`}
            >
              <p className="text-xs font-medium opacity-70">{msg.senderName ?? msg.senderType}</p>
              <p>{msg.message}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Digite sua mensagem..."
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={enviarChat.isPending || !message.trim()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
      </section>
    </div>
    </>
  );
}
