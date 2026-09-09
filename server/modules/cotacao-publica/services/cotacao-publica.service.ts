import { countWizardNights, meetsWizardMinNights, WIZARD_MIN_NIGHTS } from '@rsv360/shared';
import { eq } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { propostas } from '../../../../backend/src/db/schema/propostas';
import { gerarTokenPublicoProposta } from '../../../lib/proposta-token';
import { orcamentosService } from '../../orcamentos/services/orcamentos.service';
import { propostasService } from '../../propostas/services/propostas.service';
import {
  buildOrcamentoItens,
  montarDailyScheduleAsync,
  type GerarPropostaPayload,
} from './montar-roteiro';
import { resolveTaxaHospedeProposta } from './resolve-taxa-hospede-proposta';
import { resolveUpgradeVarandaProposta } from './validar-upgrade-varanda-proposta';
import { fireHotLeadNotify } from './hot-lead-notify.service';
import { buildPropostaPublicaResponse } from '../../propostas/proposta-publica-payload';
import { buildValidadePayload, PropostaExpiradaError } from '../../propostas/proposta-validade';
import { aplicarValidadeProposta } from '../../propostas/aplicar-validade-proposta';
import { recordPropostaGerada, recordRoteiroView } from '../../propostas/metrics';
import {
  assertDisponibilidadeReserva,
  DisponibilidadeReservaConflictError,
} from '../../acomodacoes/services/disponibilidade-reserva.hook';
import { acomodacoesService } from '../../acomodacoes/services/acomodacoes.service';
import { resolveModoReserva } from '../../acomodacoes/services/listing-slug.util';
import { assertHotelMatchProposta } from './assert-hotel-match-proposta';

function resolveAcomodacaoId(payload: GerarPropostaPayload): number | null {
  const raw = payload.selectedAcomodacaoId;
  if (raw == null) return null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

const attemptDebounceMap = new Map<string, number>();
const successCooldownMap = new Map<string, number>();

function propostaAttemptDebounceMs(): number {
  const raw = process.env.PROPOSTA_ATTEMPT_DEBOUNCE_MS;
  if (raw !== undefined && raw !== '') return Math.max(0, Number(raw) || 0);
  return process.env.NODE_ENV === 'production' ? 3_000 : 0;
}

function propostaSuccessCooldownMs(): number {
  const raw = process.env.PROPOSTA_SUCCESS_COOLDOWN_MS;
  if (raw !== undefined && raw !== '') return Math.max(0, Number(raw) || 0);
  return process.env.NODE_ENV === 'production' ? 45_000 : 0;
}

function checkAttemptDebounce(ip: string): boolean {
  const debounceMs = propostaAttemptDebounceMs();
  if (debounceMs <= 0) return true;
  const now = Date.now();
  const last = attemptDebounceMap.get(ip) ?? 0;
  if (now - last < debounceMs) return false;
  attemptDebounceMap.set(ip, now);
  return true;
}

function checkSuccessCooldown(ip: string): boolean {
  const cooldownMs = propostaSuccessCooldownMs();
  if (cooldownMs <= 0) return true;
  const now = Date.now();
  const last = successCooldownMap.get(ip) ?? 0;
  if (now - last < cooldownMs) return false;
  return true;
}

function markSuccessCooldown(ip: string): void {
  const cooldownMs = propostaSuccessCooldownMs();
  if (cooldownMs <= 0) return;
  successCooldownMap.set(ip, Date.now());
}

export class CotacaoPublicaService {
  async gerarProposta(payload: GerarPropostaPayload, clientIp = 'unknown') {
    if (!checkAttemptDebounce(clientIp)) {
      throw new Error('Aguarde alguns segundos antes de tentar novamente.');
    }

    if (!payload.checkIn || !payload.checkOut || !payload.name || !payload.phone) {
      throw new Error('Dados incompletos');
    }

    const email = String(payload.email ?? '').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('E-mail válido é obrigatório');
    }

    if (!meetsWizardMinNights(payload.checkIn, payload.checkOut)) {
      throw new Error(`Estadia mínima de ${WIZARD_MIN_NIGHTS} noites para reservar.`);
    }

    if (!checkSuccessCooldown(clientIp)) {
      throw new Error('Muitas solicitações. Aguarde 1 minuto.');
    }

    const acomodacaoId = resolveAcomodacaoId(payload);
    if (acomodacaoId) {
      await assertHotelMatchProposta(acomodacaoId, payload.hotelId);
      await assertDisponibilidadeReserva(acomodacaoId, payload.checkIn, payload.checkOut);
    }

    const acomodacaoSnapshot = await resolveUpgradeVarandaProposta(payload);
    const payloadResolvido: GerarPropostaPayload = { ...payload, acomodacaoSnapshot };

    const nights = countWizardNights(payload.checkIn, payload.checkOut);

    const hotel = payload.catalog?.hotels?.find(
      (h) => h.id === payload.hotelId || String(h.id) === String(payload.hotelId),
    );
    const titulo = `Cotação Caldas Novas — ${payload.name}`;
    const dailySchedule = await montarDailyScheduleAsync(payloadResolvido);
    const itensData = buildOrcamentoItens(payloadResolvido);

    const taxaHospedeResolvida = await resolveTaxaHospedeProposta(
      payloadResolvido,
      itensData,
      itensData.length,
    );
    if (taxaHospedeResolvida) {
      itensData.push(taxaHospedeResolvida.linhaOrcamento);
    }

    const subtotal = itensData.reduce((sum, i) => sum + parseFloat(i.precoTotal), 0);
    const total = taxaHospedeResolvida ? subtotal : (payload.total ?? subtotal);

    const orcamento = await orcamentosService.create({
      titulo,
      clienteNome: payload.name,
      clienteEmail: payload.email ?? null,
      clienteTelefone: payload.phone,
      status: 'sent',
      subtotal: String(subtotal),
      total: String(total),
      notas: payload.notes ?? null,
      metadata: {
        destino: 'Caldas Novas',
        wizardProfile: payload.profile,
        checkIn: payload.checkIn,
        checkOut: payload.checkOut,
        adults: payload.adults,
        children: payload.children,
        paymentMethod: payload.paymentMethod,
        origem: 'cotacao-wizard-v2',
        ...acomodacaoSnapshot,
        ...(taxaHospedeResolvida?.snapshot ?? {}),
      },
    });

    for (const item of itensData) {
      await orcamentosService.addItem(orcamento.id, item);
    }

    const proposta = await propostasService.createFromOrcamento(orcamento.id, undefined, {
      destino: 'Caldas Novas',
      skipValidade: true,
    });

    try {
      if (payload.hotelId) {
        const { reservarVaga } = require('../../fornecedores-hub/services/reservar-vaga');
        await reservarVaga({
          parceiroId: String(payload.hotelId),
          ofertaId: String(payload.hotelId),
          propostaId: proposta.id,
        });
      }
    } catch (lockErr) {
      console.warn('[cotacao-publica] reservarVaga ignorado:', (lockErr as Error).message);
    }

    let modoReservaListing: 'instantanea' | 'aprovar' = 'instantanea';
    if (acomodacaoId) {
      const listing = await acomodacoesService.findById(acomodacaoId);
      const listingMeta =
        listing?.metadata &&
        typeof listing.metadata === 'object' &&
        !Array.isArray(listing.metadata)
          ? (listing.metadata as Record<string, unknown>)
          : {};
      modoReservaListing = resolveModoReserva(listingMeta.modoReserva);
    }

    const token = gerarTokenPublicoProposta();
    const publicBase =
      process.env.COTACAO_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000';
    const urlPublica = `${publicBase.replace(/\/$/, '')}/proposta/${token}`;

    const conteudo = {
      itens: itensData,
      dailySchedule,
      inclusions: {
        hotel: hotel?.title,
        nights,
        guests: payload.adults + payload.children,
        breakfast: payload.breakfastId,
        profile: payload.profile,
        previewTitle: 'Caldas Novas Premium',
        destination: 'Caldas Novas, GO',
      },
      media: {
        heroImage:
          hotel?.images?.[0] ??
          (Array.isArray(hotel?.metadata?.images) ? hotel.metadata.images[0] : undefined) ??
          dailySchedule[0]?.image,
      },
      origem: 'cotacao-wizard-v2',
      acomodacaoEscolha: acomodacaoSnapshot,
    };

    await db
      .update(propostas)
      .set({
        tokenPublico: token,
        isPublica: true,
        status: 'sent',
        conteudo,
        metadata: {
          hitlMode: 'ai',
          wizardProfile: payload.profile,
          checkIn: payload.checkIn,
          checkOut: payload.checkOut,
          adults: payload.adults,
          children: payload.children,
          hotelId: payload.hotelId != null ? String(payload.hotelId) : undefined,
          acomodacaoId: acomodacaoId ?? undefined,
          modoReserva: modoReservaListing,
          ...acomodacaoSnapshot,
          ...(taxaHospedeResolvida?.snapshot ?? {}),
        },
        updatedAt: new Date(),
      })
      .where(eq(propostas.id, proposta.id));

    const validoAte = await aplicarValidadeProposta(proposta.id);

    await propostasService.registrarVisualizacao(proposta.id);

    fireHotLeadNotify({
      propostaId: proposta.id,
      clienteNome: payload.name,
      clienteTelefone: payload.phone,
      hotel: hotel?.title ?? 'Caldas Novas',
      datas: `${payload.checkIn} → ${payload.checkOut}`,
      valor: total,
      urlPublica,
      profile: payload.profile ?? 'casal',
    });

    markSuccessCooldown(clientIp);
    recordPropostaGerada('wizard');

    return {
      propostaId: proposta.id,
      tokenPublico: token,
      validoAte: validoAte.toISOString(),
      url: `/proposta/${token}`,
      urlPublica,
    };
  }

  async getPropostaByToken(token: string) {
    const [row] = await db.select().from(propostas).where(eq(propostas.tokenPublico, token));
    if (!row || !row.isPublica) return null;

    await propostasService.registrarVisualizacao(row.id);

    return buildPropostaPublicaResponse(row);
  }

  async getValidadeByToken(token: string) {
    const [row] = await db.select().from(propostas).where(eq(propostas.tokenPublico, token));
    if (!row || !row.isPublica) return null;
    return buildValidadePayload(row);
  }

  async aceitarPropostaByToken(token: string, clientName?: string) {
    const [row] = await db.select().from(propostas).where(eq(propostas.tokenPublico, token));
    if (!row || !row.isPublica) return null;

    const updated = await propostasService.respondPublic(row.id, 'accept', clientName);
    const awaitingHost = updated?.status === 'pending_host';
    return {
      proposta: updated,
      awaitingHostApproval: awaitingHost,
      proximoDestino: awaitingHost ? `/proposta/${token}` : `/roteiro/${token}`,
      mensagem: awaitingHost
        ? 'Pedido enviado. Aguarde a aprovação do anfitrião.'
        : undefined,
    };
  }

  async getRoteiroByToken(token: string) {
    const [row] = await db.select().from(propostas).where(eq(propostas.tokenPublico, token));
    if (!row || !row.isPublica) return null;

    const statusPermitido = ['accepted', 'paid'];
    if (!statusPermitido.includes(row.status)) {
      const err = new Error('Acesso ao roteiro premium requer proposta aceita ou paga');
      (err as Error & { statusCode: number; propostaStatus: string }).statusCode = 403;
      (err as Error & { propostaStatus: string }).propostaStatus = row.status;
      throw err;
    }

    await propostasService.logEvent(
      row.id,
      'roteiro_view',
      'Visualização do roteiro premium cinematográfico',
      { token, status: row.status },
    );
    recordRoteiroView();

    return {
      id: row.id,
      titulo: row.titulo,
      clienteNome: row.clienteNome,
      valorTotal: row.valorTotal,
      moeda: row.moeda,
      status: row.status,
      conteudo: row.conteudo,
      metadata: row.metadata,
      tokenPublico: row.tokenPublico,
      comparativoCache: row.comparativoCache ?? undefined,
      exibirComparativo: row.exibirComparativo ?? false,
    };
  }

  async verificarRoteiroByToken(token: string) {
    const [row] = await db.select().from(propostas).where(eq(propostas.tokenPublico, token));
    if (!row || !row.isPublica) return null;

    const conteudo = row.conteudo as { inclusions?: { destination?: string } } | null;
    const destino = conteudo?.inclusions?.destination ?? 'Caldas Novas, GO';

    return {
      autentico: true,
      token: row.tokenPublico,
      titulo: row.titulo,
      destino,
      status: row.status,
      emitidoEm: row.createdAt,
      clienteNome: row.clienteNome,
      roteiroUrl: `/roteiro/${row.tokenPublico}`,
    };
  }

  async registrarEngagementRoteiro(
    token: string,
    input: { tempoMs?: number; scrollDepthPct?: number },
  ) {
    const [row] = await db.select().from(propostas).where(eq(propostas.tokenPublico, token));
    if (!row || !row.isPublica) return null;

    const statusPermitido = ['accepted', 'paid'];
    if (!statusPermitido.includes(row.status)) {
      const err = new Error('Evento de roteiro requer proposta aceita ou paga');
      (err as Error & { statusCode: number; propostaStatus: string }).statusCode = 403;
      (err as Error & { propostaStatus: string }).propostaStatus = row.status;
      throw err;
    }

    const eventos: string[] = [];
    const tempoMs =
      typeof input.tempoMs === 'number' && Number.isFinite(input.tempoMs)
        ? Math.max(0, Math.round(input.tempoMs))
        : null;
    const scrollDepthPct =
      typeof input.scrollDepthPct === 'number' && Number.isFinite(input.scrollDepthPct)
        ? Math.min(100, Math.max(0, Math.round(input.scrollDepthPct)))
        : null;

    if (tempoMs !== null) {
      await propostasService.logEvent(
        row.id,
        'tempo_pagina',
        'Tempo na página do roteiro cinematográfico',
        { tempoMs, token, scrollDepthPct },
      );
      eventos.push('tempo_pagina');
    }

    if (scrollDepthPct !== null) {
      await propostasService.logEvent(
        row.id,
        'cinematic_scroll',
        'Profundidade de scroll no roteiro cinematográfico',
        { scrollDepthPct, token, tempoMs },
      );
      eventos.push('cinematic_scroll');
    }

    return { propostaId: row.id, eventos };
  }
}

export const cotacaoPublicaService = new CotacaoPublicaService();
module.exports = {
  CotacaoPublicaService,
  cotacaoPublicaService,
  PropostaExpiradaError,
  DisponibilidadeReservaConflictError,
};
