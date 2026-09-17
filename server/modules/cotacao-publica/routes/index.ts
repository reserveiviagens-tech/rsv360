import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { meetsWizardMinNights, WIZARD_MIN_NIGHTS } from '@rsv360/shared';
import { cotacaoPublicaService } from '../services/cotacao-publica.service';
import {
  DisponibilidadeReservaConflictError,
  RegrasEstadiaAcomodacaoError,
} from '../../acomodacoes/services/disponibilidade-reserva.hook';
import { registrarLeadAbandono } from '../services/lead-abandono.service';
import { isPropostaExpiradaError } from '../../propostas/proposta-validade';
import { registrarIndicacao } from '../../propostas/mgm';
import { publicLimiter } from '../../../middleware/public-limiter';
import { isRoteiroInteligenteEnabled } from '../services/montar-roteiro';
import { listRoteiroAtracoes } from '../services/roteiro-atracoes.service';
import { parseGerarPropostaBody } from '../schemas/gerar-proposta.schema';
import { requireTurnstile } from '../../../middleware/turnstile.middleware';
import { obterTaxaHospedePublica } from '../services/resolve-taxa-hospede-proposta';
import { asRequiredString } from '../../../lib/parse';
import { HotelMismatchError } from '../services/assert-hotel-match-proposta';
import { db } from '../../../lib/db';
import { propostas } from '../../../../backend/src/db/schema/propostas';
import { users } from '../../../../backend/src/db/schema/existing';

const router = Router();

/** PG unique_violation — race em registrarIndicacao (SELECT→INSERT). */
function isPgUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; message?: string; cause?: { code?: string; message?: string } };
  const code = e?.code ?? e?.cause?.code;
  if (code === '23505') return true;
  const msg = `${e?.message ?? ''} ${e?.cause?.message ?? ''}`;
  return /unique/i.test(msg);
}

function parseIndicadorId(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function statusForGerarPropostaError(message: string): number {
  if (message.includes('Muitas solicitações')) return 429;
  if (message.includes('Aguarde alguns segundos')) return 429;
  if (message === 'Dados incompletos') return 400;
  if (message.includes('Estadia mínima de')) return 400;
  return 500;
}

router.get('/health', (_req, res) => {
  res.json({ module: 'cotacao-publica', status: 'ok' });
});

router.get('/taxa-hospede-publica', publicLimiter, async (_req, res) => {
  try {
    const taxaHospedePublica = await obterTaxaHospedePublica();
    res.json({ success: true, data: taxaHospedePublica });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/buscar-ofertas', publicLimiter, async (req, res) => {
  try {
    const { checkin, checkout, hospedes } = req.body ?? {};
    if (!checkin || !checkout || !hospedes) {
      return res.status(400).json({ success: false, error: 'checkin, checkout e hospedes são obrigatórios' });
    }
    if (!meetsWizardMinNights(String(checkin), String(checkout))) {
      return res.status(400).json({
        success: false,
        error: `Estadia mínima de ${WIZARD_MIN_NIGHTS} noites para reservar.`,
      });
    }
    const { fornecedoresCotacaoHub } = require('../../fornecedores-hub/cotacao-orchestrator');
    const data = await fornecedoresCotacaoHub.processarCotacao({
      checkin: String(checkin),
      checkout: String(checkout),
      hospedes: Number(hospedes) || 1,
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/lead-abandono', publicLimiter, async (req, res) => {
  try {
    const body = req.body ?? {};
    const passo = Number(body.passo);
    if (!Number.isFinite(passo) || passo < 0 || passo > 7) {
      return res.status(400).json({ success: false, error: 'passo inválido' });
    }
    const data = await registrarLeadAbandono({
      passo,
      passoNome: body.passoNome ? String(body.passoNome) : undefined,
      whatsapp: body.whatsapp ? String(body.whatsapp) : null,
      nome: body.nome ? String(body.nome) : null,
      hotelId: body.hotelId ? String(body.hotelId) : null,
      checkin: body.checkin ? String(body.checkin) : null,
      checkout: body.checkout ? String(body.checkout) : null,
      adults: body.adults != null ? Number(body.adults) : null,
      children: body.children != null ? Number(body.children) : null,
      ref: body.ref ? String(body.ref) : null,
      canal: body.canal ? String(body.canal) : null,
      consentimentoLgpd: body.consentimentoLgpd === true,
      sessaoId: body.sessaoId ? String(body.sessaoId) : null,
      variant: body.variant ? String(body.variant) : undefined,
      payload: typeof body.payload === 'object' && body.payload ? body.payload : undefined,
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/gerar-proposta', publicLimiter, requireTurnstile, async (req, res) => {
  try {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    const payload = parseGerarPropostaBody(req.body);
    const data = await cotacaoPublicaService.gerarProposta(payload, ip);
    res.status(201).json({ success: true, data });
  } catch (error) {
    const err = error as Error;
    console.error('[cotacao-publica] gerar-proposta', err);
    if (error instanceof DisponibilidadeReservaConflictError) {
      return res.status(409).json({
        success: false,
        error: err.message,
        acomodacaoId: error.acomodacaoId,
        datasIndisponiveis: error.datasIndisponiveis,
      });
    }
    if (error instanceof RegrasEstadiaAcomodacaoError) {
      return res.status(400).json({
        success: false,
        error: err.message,
        code: error.code,
      });
    }
    if (error instanceof HotelMismatchError) {
      return res.status(422).json({
        success: false,
        error: err.message,
        code: error.code,
      });
    }
    const status = statusForGerarPropostaError(err.message);
    res.status(status).json({ success: false, error: err.message });
  }
});

async function respondPropostaByToken(
  res: import('express').Response,
  token: string,
): Promise<void> {
  const data = await cotacaoPublicaService.getPropostaByToken(token);
  if (!data) {
    res.status(404).json({ success: false, error: 'Proposta não encontrada' });
    return;
  }
  res.json({ success: true, data });
}

/** Alias curto `/p/:token` (mesmo payload de `/proposta/:token`). */
router.get('/p/:token', publicLimiter, async (req, res) => {
  try {
    await respondPropostaByToken(res, asRequiredString(req.params.token));
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/proposta/:token', publicLimiter, async (req, res) => {
  try {
    await respondPropostaByToken(res, asRequiredString(req.params.token));
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/proposta/:token/validade', publicLimiter, async (req, res) => {
  try {
    const data = await cotacaoPublicaService.getValidadeByToken(asRequiredString(req.params.token));
    if (!data) return res.status(404).json({ success: false, error: 'Proposta não encontrada' });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/proposta/:token/aceitar', publicLimiter, requireTurnstile, async (req, res) => {
  try {
    const data = await cotacaoPublicaService.aceitarPropostaByToken(
      asRequiredString(req.params.token),
      req.body?.clientName,
    );
    if (!data) return res.status(404).json({ success: false, error: 'Proposta não encontrada' });
    res.json({ success: true, status: 'sucesso', data });
  } catch (error) {
    if (isPropostaExpiradaError(error)) {
      return res.status(403).json({ success: false, error: error.message });
    }
    if (error instanceof DisponibilidadeReservaConflictError) {
      return res.status(409).json({
        success: false,
        error: error.message,
        acomodacaoId: error.acomodacaoId,
        datasIndisponiveis: error.datasIndisponiveis,
      });
    }
    if (error instanceof RegrasEstadiaAcomodacaoError) {
      return res.status(400).json({
        success: false,
        error: error.message,
        code: error.code,
      });
    }
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * Tracking MGM público — capability = tokenPublico.
 * Não usa getPropostaByToken (evita registrarVisualizacao).
 * Rota admin POST /propostas/:id/indicacao permanece inalterada.
 */
router.post('/proposta/:token/indicacao', publicLimiter, async (req, res) => {
  try {
    const token = asRequiredString(req.params.token);
    const indicadorId = parseIndicadorId(req.body?.indicadorId);
    if (indicadorId == null) {
      return res.status(400).json({ success: false, error: 'indicadorId inválido' });
    }

    const [proposta] = await db
      .select({
        tokenPublico: propostas.tokenPublico,
        isPublica: propostas.isPublica,
      })
      .from(propostas)
      .where(eq(propostas.tokenPublico, token))
      .limit(1);

    if (!proposta?.tokenPublico || proposta.isPublica !== true) {
      return res.status(404).json({ success: false, error: 'Proposta não encontrada' });
    }

    const [indicador] = await db
      .select({ id: users.id, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, indicadorId))
      .limit(1);

    if (!indicador || indicador.isActive !== true) {
      return res.status(400).json({ success: false, error: 'indicadorId inválido' });
    }

    const canal =
      typeof req.body?.canal === 'string' && req.body.canal.trim()
        ? req.body.canal.trim().slice(0, 64)
        : undefined;

    try {
      await registrarIndicacao({
        indicadorId,
        tokenProposta: proposta.tokenPublico,
        canal,
      });
    } catch (err) {
      if (isPgUniqueViolation(err)) {
        return res.status(201).json({ success: true });
      }
      throw err;
    }

    return res.status(201).json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.get('/roteiro-atracoes', publicLimiter, async (req, res) => {
  try {
    const enabled = isRoteiroInteligenteEnabled();
    if (!enabled) {
      res.set('Cache-Control', 'private, no-store');
      return res.json({ success: true, enabled: false, data: [] });
    }
    const turno = req.query.turno ? String(req.query.turno) : undefined;
    const publico = req.query.publico ? String(req.query.publico) : undefined;
    const data = await listRoteiroAtracoes({ turno, publico });
    res.set('Cache-Control', 'private, no-store');
    res.json({ success: true, enabled: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/roteiro/:token/verificar', publicLimiter, async (req, res) => {
  try {
    const data = await cotacaoPublicaService.verificarRoteiroByToken(asRequiredString(req.params.token));
    if (!data) return res.status(404).json({ success: false, error: 'Token não encontrado' });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/roteiro/:token', publicLimiter, async (req, res) => {
  try {
    const data = await cotacaoPublicaService.getRoteiroByToken(asRequiredString(req.params.token));
    if (!data) return res.status(404).json({ success: false, error: 'Roteiro não encontrado' });
    res.json({ success: true, data });
  } catch (error) {
    const err = error as Error & { statusCode?: number; propostaStatus?: string };
    if (err.statusCode === 403) {
      return res.status(403).json({
        success: false,
        error: err.message,
        status: err.propostaStatus,
        redirect: `/proposta/${req.params.token}`,
      });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/roteiro/:token/evento', publicLimiter, async (req, res) => {
  try {
    const { tempoMs, scrollDepthPct } = req.body ?? {};
    const data = await cotacaoPublicaService.registrarEngagementRoteiro(asRequiredString(req.params.token), {
      tempoMs,
      scrollDepthPct,
    });
    if (!data) return res.status(404).json({ success: false, error: 'Roteiro não encontrado' });
    res.status(201).json({ success: true, data });
  } catch (error) {
    const err = error as Error & { statusCode?: number; propostaStatus?: string };
    if (err.statusCode === 403) {
      return res.status(403).json({
        success: false,
        error: err.message,
        status: err.propostaStatus,
      });
    }
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
module.exports = router;
