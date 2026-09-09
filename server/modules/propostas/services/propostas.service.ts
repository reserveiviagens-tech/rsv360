import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../../lib/db';
import {
  pacotesTemplate,
  propostaChat,
  propostaEventos,
  propostas,
} from '../../../../backend/src/db/schema/propostas';
import { orcamentos, orcamentoItens } from '../../../../backend/src/db/schema/orcamentos';
import { montarComparativoProposta } from './montar-proposta';
import { assertPropostaNaoExpirada, PropostaExpiradaError } from '../proposta-validade';
import { aplicarValidadeProposta } from '../aplicar-validade-proposta';
import { agendarAvaliarObjecao, agendarEntregaRoteiro } from '../propostas.queue';
import { ConfigService } from '../../configuracoes/config.service';
import { recordPropostaAceita, recordPropostaGerada } from '../metrics';
import { detectarObjecaoPreco, revelarComparativo } from '../objecao';
import { comHoldReservaAtomico } from '../../acomodacoes/services/disponibilidade-reserva.hook';
import { acomodacoesService } from '../../acomodacoes/services/acomodacoes.service';

type HitlMode = 'ai' | 'waiting' | 'human';

function parseMetadata(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

export class PropostasService {
  async list(filters: { status?: string; enterpriseId?: number } = {}) {
    const conditions = [];
    if (filters.status) conditions.push(eq(propostas.status, filters.status));
    if (filters.enterpriseId) conditions.push(eq(propostas.enterpriseId, filters.enterpriseId));

    const query = db.select().from(propostas).orderBy(desc(propostas.createdAt));
    if (conditions.length) return query.where(and(...conditions));
    return query;
  }

  async getById(id: number) {
    const [row] = await db.select().from(propostas).where(eq(propostas.id, id));
    if (!row) return null;

    const eventos = await db
      .select()
      .from(propostaEventos)
      .where(eq(propostaEventos.propostaId, id))
      .orderBy(desc(propostaEventos.createdAt));

    const chat = await db
      .select()
      .from(propostaChat)
      .where(eq(propostaChat.propostaId, id))
      .orderBy(propostaChat.createdAt);

    return { ...row, eventos, chat };
  }

  async create(data: Record<string, unknown>, actorId?: number) {
    const [created] = await db
      .insert(propostas)
      .values(data as typeof propostas.$inferInsert)
      .returning();

    await this.logEvent(created.id, 'created', 'Proposta criada', { actorId }, actorId);
    recordPropostaGerada('staff');

    if (
      created.isPublica &&
      ['sent', 'pending'].includes(created.status) &&
      !created.validoAte
    ) {
      try {
        const validoAte = await aplicarValidadeProposta(created.id);
        return { ...created, validoAte };
      } catch (queueErr) {
        console.warn('[propostas] aplicarValidadeProposta no create staff:', (queueErr as Error).message);
      }
    }

    return created;
  }

  async update(id: number, data: Record<string, unknown>, actorId?: number) {
    const [updated] = await db
      .update(propostas)
      .set({ ...data, updatedAt: new Date() } as Partial<typeof propostas.$inferInsert>)
      .where(eq(propostas.id, id))
      .returning();

    if (updated) {
      await this.logEvent(id, 'updated', 'Proposta atualizada', { fields: Object.keys(data) }, actorId);
    }
    return updated ?? null;
  }

  async changeStatus(id: number, status: string, actorId?: number) {
    const updated = await this.update(id, { status }, actorId);
    if (updated && (status === 'accepted' || status === 'paid')) {
      await this.afterAcceptedStatus(id, actorId);
    }
    return updated;
  }

  private async afterAcceptedStatus(id: number, actorId?: number) {
    recordPropostaAceita(actorId ? 'staff' : 'public');
    try {
      const config = await ConfigService.obterRegrasCotacao();
      const delayMs = (config.delayDisparoMinutos ?? 0) * 60_000;
      await agendarEntregaRoteiro(id, delayMs);
    } catch (queueErr) {
      console.warn('[propostas] agendarEntregaRoteiro ignorado:', (queueErr as Error).message);
    }
  }

  async remove(id: number) {
    const [deleted] = await db.delete(propostas).where(eq(propostas.id, id)).returning();
    return deleted ?? null;
  }

  async createFromOrcamento(
    orcamentoId: number,
    actorId?: number,
    options?: { destino?: string; skipValidade?: boolean },
  ) {
    const orc = await db.select().from(orcamentos).where(eq(orcamentos.id, orcamentoId));
    const [budget] = orc;
    if (!budget) throw new Error('Orçamento não encontrado');

    const itens = await db
      .select()
      .from(orcamentoItens)
      .where(eq(orcamentoItens.orcamentoId, orcamentoId));

    const precoAgencia = Number(budget.total);
    const destino =
      options?.destino ??
      (typeof budget.metadata === 'object' &&
      budget.metadata &&
      'destino' in (budget.metadata as object)
        ? String((budget.metadata as Record<string, unknown>).destino)
        : 'Caldas Novas');

    const ancoragem = await montarComparativoProposta({
      precoAgencia,
      destino,
      tipo: 'hospedagem',
    });

    const [created] = await db
      .insert(propostas)
      .values({
        orcamentoId,
        titulo: budget.titulo,
        clienteNome: budget.clienteNome,
        clienteEmail: budget.clienteEmail,
        clienteTelefone: budget.clienteTelefone,
        valorTotal: budget.total,
        moeda: budget.moeda,
        status: 'draft',
        comparativoCache: ancoragem.comparativo,
        exibirComparativo: false,
        conteudo: {
          itens,
          origem: 'orcamento',
          orcamentoId,
          temAncora: ancoragem.temAncora,
          comparativoOrigem: ancoragem.origem,
        },
        metadata: { hitlMode: 'ai' satisfies HitlMode, temAncora: ancoragem.temAncora },
      })
      .returning();

    await this.logEvent(created.id, 'from_orcamento', `Gerada a partir do orçamento #${orcamentoId}`, { orcamentoId }, actorId);

    try {
      await agendarAvaliarObjecao(created.id, 24 * 60 * 60 * 1000);
    } catch {
      /* Redis/BullMQ opcional em dev */
    }

    if (!options?.skipValidade) {
      try {
        const validoAte = await aplicarValidadeProposta(created.id);
        return { ...created, validoAte };
      } catch (validadeErr) {
        console.warn('[propostas] aplicarValidadeProposta ignorado:', (validadeErr as Error).message);
      }
    }

    return created;
  }

  async logEvent(
    propostaId: number,
    tipo: string,
    descricao?: string,
    payload?: Record<string, unknown>,
    actorId?: number,
  ) {
    const [evento] = await db
      .insert(propostaEventos)
      .values({
        propostaId,
        tipo,
        descricao,
        payload,
        actorId: actorId ?? null,
      })
      .returning();
    return evento;
  }

  async registrarVisualizacao(propostaId: number, actorId?: number) {
    await this.logEvent(propostaId, 'visualizacao', 'Proposta visualizada', {}, actorId);
    return { propostaId };
  }

  async revelarComparativoManual(propostaId: number) {
    const result = await revelarComparativo(propostaId, 'manual');
    if (!result) throw new Error('Comparativo já revelado ou indisponível');
    return result;
  }

  async listChat(propostaId: number) {
    return db
      .select()
      .from(propostaChat)
      .where(eq(propostaChat.propostaId, propostaId))
      .orderBy(propostaChat.createdAt);
  }

  async addChatMessage(
    propostaId: number,
    input: { senderType: string; senderName?: string; message: string },
  ) {
    const [msg] = await db
      .insert(propostaChat)
      .values({
        propostaId,
        senderType: input.senderType,
        senderName: input.senderName ?? null,
        message: input.message,
      })
      .returning();

    await this.logEvent(propostaId, 'chat_message', 'Nova mensagem no chat', {
      senderType: input.senderType,
      messageId: msg.id,
    });

    if (input.senderType === 'client') {
      if (detectarObjecaoPreco(input.message)) {
        await revelarComparativo(propostaId, 'ia');
      }
    }

    return msg;
  }

  async getHitlState(propostaId: number) {
    const [row] = await db.select().from(propostas).where(eq(propostas.id, propostaId));
    if (!row) return null;
    const meta = parseMetadata(row.metadata);
    return {
      propostaId,
      hitlMode: (meta.hitlMode as HitlMode) ?? 'ai',
      assignedAgentId: meta.assignedAgentId ?? null,
      assignedAgentName: meta.assignedAgentName ?? null,
    };
  }

  async requestHitl(propostaId: number, clientName?: string) {
    const [row] = await db.select().from(propostas).where(eq(propostas.id, propostaId));
    if (!row) throw new Error('Proposta não encontrada');

    const meta = parseMetadata(row.metadata);
    const nextMeta = { ...meta, hitlMode: 'waiting' as HitlMode };

    await db
      .update(propostas)
      .set({ metadata: nextMeta, updatedAt: new Date() })
      .where(eq(propostas.id, propostaId));

    await this.addChatMessage(propostaId, {
      senderType: 'system',
      senderName: 'Sistema',
      message: `${clientName ?? 'Cliente'} solicitou atendimento humano.`,
    });

    await this.logEvent(propostaId, 'hitl_request', 'Cliente solicitou HITL');
    return this.getHitlState(propostaId);
  }

  async takeoverHitl(propostaId: number, agent: { id: number; name?: string }) {
    const [row] = await db.select().from(propostas).where(eq(propostas.id, propostaId));
    if (!row) throw new Error('Proposta não encontrada');

    const meta = parseMetadata(row.metadata);
    const nextMeta = {
      ...meta,
      hitlMode: 'human' as HitlMode,
      assignedAgentId: agent.id,
      assignedAgentName: agent.name ?? null,
    };

    await db
      .update(propostas)
      .set({ metadata: nextMeta, updatedAt: new Date() })
      .where(eq(propostas.id, propostaId));

    await this.addChatMessage(propostaId, {
      senderType: 'agent',
      senderName: agent.name ?? 'Consultor',
      message: 'Olá! Sou seu consultor e vou continuar este atendimento.',
    });

    await this.logEvent(propostaId, 'hitl_takeover', 'Agente assumiu o chat', { agentId: agent.id }, agent.id);
    return this.getHitlState(propostaId);
  }

  async releaseHitl(propostaId: number, actorId?: number) {
    const [row] = await db.select().from(propostas).where(eq(propostas.id, propostaId));
    if (!row) throw new Error('Proposta não encontrada');

    const meta = parseMetadata(row.metadata);
    const nextMeta: Record<string, unknown> = {
      ...meta,
      hitlMode: 'ai' as HitlMode,
      assignedAgentId: null as number | null,
      assignedAgentName: null as string | null,
    };

    await db
      .update(propostas)
      .set({ metadata: nextMeta, updatedAt: new Date() })
      .where(eq(propostas.id, propostaId));

    await this.addChatMessage(propostaId, {
      senderType: 'system',
      senderName: 'CaldasAI',
      message: 'Atendimento devolvido ao assistente virtual.',
    });

    await this.logEvent(propostaId, 'hitl_release', 'Chat devolvido à IA', {}, actorId);
    return this.getHitlState(propostaId);
  }

  async listTemplates(enterpriseId?: number) {
    if (enterpriseId) {
      return db.select().from(pacotesTemplate).where(eq(pacotesTemplate.enterpriseId, enterpriseId));
    }
    return db.select().from(pacotesTemplate).orderBy(desc(pacotesTemplate.createdAt));
  }

  async createTemplate(data: Record<string, unknown>) {
    const [created] = await db
      .insert(pacotesTemplate)
      .values(data as typeof pacotesTemplate.$inferInsert)
      .returning();
    return created;
  }

  async getTemplate(id: number) {
    const [row] = await db.select().from(pacotesTemplate).where(eq(pacotesTemplate.id, id));
    return row ?? null;
  }

  async updateTemplate(id: number, data: Record<string, unknown>) {
    const [updated] = await db
      .update(pacotesTemplate)
      .set({ ...data, updatedAt: new Date() } as Partial<typeof pacotesTemplate.$inferInsert>)
      .where(eq(pacotesTemplate.id, id))
      .returning();
    return updated ?? null;
  }

  async deleteTemplate(id: number) {
    const [deleted] = await db.delete(pacotesTemplate).where(eq(pacotesTemplate.id, id)).returning();
    return deleted ?? null;
  }

  async respondPublic(propostaId: number, action: 'accept' | 'reject', clientName?: string) {
    const [row] = await db.select().from(propostas).where(eq(propostas.id, propostaId));
    if (!row) throw new Error('Proposta não encontrada');
    if (!row.isPublica) throw new Error('Proposta não disponível publicamente');
    if (['accepted', 'rejected', 'cancelled', 'pending_host'].includes(row.status)) {
      throw new Error('Proposta já foi respondida');
    }

    let updated;
    if (action === 'accept') {
      await assertPropostaNaoExpirada(row);
      const meta = parseMetadata(row.metadata);
      const acomodacaoId =
        meta.acomodacaoId != null && Number.isFinite(Number(meta.acomodacaoId))
          ? Number(meta.acomodacaoId)
          : null;
      const checkIn = typeof meta.checkIn === 'string' ? meta.checkIn : null;
      const checkOut = typeof meta.checkOut === 'string' ? meta.checkOut : null;

      let modoReserva = meta.modoReserva === 'aprovar' ? 'aprovar' : 'instantanea';
      if (acomodacaoId && meta.modoReserva == null) {
        const listing = await acomodacoesService.findById(acomodacaoId);
        const listingMeta =
          listing?.metadata &&
          typeof listing.metadata === 'object' &&
          !Array.isArray(listing.metadata)
            ? (listing.metadata as Record<string, unknown>)
            : {};
        modoReserva = listingMeta.modoReserva === 'aprovar' ? 'aprovar' : 'instantanea';
      }

      if (acomodacaoId && checkIn && checkOut && modoReserva === 'aprovar') {
        const [pending] = await db
          .update(propostas)
          .set({
            status: 'pending_host',
            metadata: { ...meta, modoReserva: 'aprovar' },
            updatedAt: new Date(),
          })
          .where(and(eq(propostas.id, propostaId), eq(propostas.status, row.status)))
          .returning();
        if (!pending) throw new Error('Proposta já foi respondida');
        updated = pending;
        await this.logEvent(propostaId, 'pending_host', 'Aguardando aprovação do anfitrião', {
          modoReserva: 'aprovar',
        });
        await this.addChatMessage(propostaId, {
          senderType: 'system',
          senderName: 'Sistema',
          message: `${clientName ?? 'Cliente'} enviou o pedido. Aguardando aprovação do anfitrião.`,
        });
        return updated;
      }

      if (acomodacaoId && checkIn && checkOut) {
        updated = await comHoldReservaAtomico(
          acomodacaoId,
          checkIn,
          checkOut,
          async (tx) => {
            const [accepted] = await tx
              .update(propostas)
              .set({ status: 'accepted', updatedAt: new Date() })
              .where(and(eq(propostas.id, propostaId), eq(propostas.status, row.status)))
              .returning();

            if (!accepted) throw new Error('Proposta já foi respondida');
            return accepted;
          },
        );

        await this.logEvent(propostaId, 'updated', 'Proposta atualizada', {
          fields: ['status'],
        });
        await this.afterAcceptedStatus(propostaId);
      }
    }

    const status = action === 'accept' ? 'accepted' : 'rejected';
    updated ??= await this.changeStatus(propostaId, status);
    await this.addChatMessage(propostaId, {
      senderType: 'system',
      senderName: 'Sistema',
      message: `${clientName ?? 'Cliente'} ${action === 'accept' ? 'aceitou' : 'recusou'} a proposta.`,
    });
    await this.logEvent(
      propostaId,
      `public_${action}`,
      action === 'accept' ? 'Proposta aceita pelo cliente' : 'Proposta recusada pelo cliente',
      { clientName },
    );

    return updated;
  }

  /** Host approves a client request (pending_host → hold + accepted). */
  async aprovarPedidoHost(propostaId: number, actorId?: number) {
    const [row] = await db.select().from(propostas).where(eq(propostas.id, propostaId));
    if (!row) throw new Error('Proposta não encontrada');
    if (row.status !== 'pending_host') throw new Error('Pedido já foi decidido');

    const meta = parseMetadata(row.metadata);
    const acomodacaoId =
      meta.acomodacaoId != null && Number.isFinite(Number(meta.acomodacaoId))
        ? Number(meta.acomodacaoId)
        : null;
    const checkIn = typeof meta.checkIn === 'string' ? meta.checkIn : null;
    const checkOut = typeof meta.checkOut === 'string' ? meta.checkOut : null;
    if (!acomodacaoId || !checkIn || !checkOut) {
      throw new Error('Pedido sem datas de estadia');
    }

    const updated = await comHoldReservaAtomico(acomodacaoId, checkIn, checkOut, async (tx) => {
      const [accepted] = await tx
        .update(propostas)
        .set({ status: 'accepted', updatedAt: new Date() })
        .where(and(eq(propostas.id, propostaId), eq(propostas.status, 'pending_host')))
        .returning();
      if (!accepted) throw new Error('Pedido já foi decidido');
      return accepted;
    });

    await this.logEvent(
      propostaId,
      'host_approved',
      'Anfitrião aprovou o pedido de reserva',
      {},
      actorId,
    );
    await this.addChatMessage(propostaId, {
      senderType: 'anfitriao',
      senderName: 'Anfitrião',
      message: 'Pedido de reserva aprovado. Boas-vindas!',
    });
    await this.afterAcceptedStatus(propostaId, actorId);
    return updated;
  }
}

export const propostasService = new PropostasService();

module.exports = { PropostasService, propostasService, PropostaExpiradaError };
