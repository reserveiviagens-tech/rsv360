import { Router, type Request } from 'express';
import { ZodError } from 'zod';
import { optionalJwt, staffAuth } from '../../../middleware/auth.middleware';
import { publicLimiter } from '../../../middleware/public-limiter';
import { requireTurnstile } from '../../../middleware/turnstile.middleware';
import { propostasService } from '../services/propostas.service';
import { recordPropostaGerada } from '../metrics';
import { PropostaExpiradaError, isPropostaExpiradaError } from '../proposta-validade';
import {
  authorizePropostaIdRead,
  authorizePropostaIdSensitive,
  authorizePropostaVisualizacao,
  buildAnonymousIdLookupPayload,
  isPropostaStaff,
  ownsProposta,
} from '../proposta-access';
import {
  recotarPropostaPorToken,
  isPropostaRecotacaoError,
} from '../services/proposta-recotacao.service';
import { gerarQrVoucherPng, isQrVoucherError } from '../services/qr-voucher.service';
import { buildPropostaOgByToken } from '../services/proposta-og.service';
import { cotacaoPublicaService } from '../../cotacao-publica/services/cotacao-publica.service';
import {
  resolvePropostaPublicaByToken,
  registrarEventosCinematicos,
} from '../services/proposta-cinematic-events.service';
import { gerarTokenPublicoProposta } from '../../../lib/proposta-token';
import { solicitarAlteracao, aprovar, negar } from '../aprovacao';
import { isPropostasAprovador } from '../rbac';
import {
  canMutatePropostaEconomicFields,
  normalizeValorTotalCap,
  payloadTouchesValorTotal,
} from '../economic-authority';
import { registrarIndicacao, resolveIndicadorIdFromAuth } from '../mgm';
import { sugerirPacoteFromProposta, criarTemplateFromProposta } from '../ia-copiloto';
import { asRequiredString } from '../../../lib/parse';
import {
  PacoteTemplateUpdateSchema,
  PacoteTemplateWriteSchema,
  PropostaIdParamSchema,
  PropostaUpdateSchema,
  PropostaWriteSchema,
  TemplateIdParamSchema,
} from '../schemas/proposta-write.schema';

const router = Router();

/**
 * G-D.1 / OD-GD-03 — `agentAuth` é **alias documentado** de `staffAuth`.
 * Mesma cadeia; não inventar set distinto de autoridade.
 * ≠ Partner role `agente` · ≠ módulo AI `/agentes`.
 * Remoção futura do alias = gate próprio.
 *
 * Matriz HTTP (esqueleto OD-GD-02): create/edit/view-staff → staffAuth;
 * approve/reject → staffAuth + isPropostasAprovador (admin only, OD-GD-04);
 * HITL takeover/release + DELETE → agentAuth (= staffAuth).
 */
const agentAuth = staffAuth;

function zodOrBad(res: import('express').Response, error: unknown) {
  if (error instanceof ZodError) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
  }
  return null;
}

function requireAuthActor(req: Request): { id: number; role: string; name?: string } {
  const id = req.user?.id;
  if (typeof id !== 'number') {
    throw new Error('Usuário não autenticado');
  }
  return { id, role: req.user?.role ?? 'user', name: req.user?.name };
}

router.get('/health', (_req, res) => {
  res.json({ module: 'propostas', status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/', ...staffAuth, async (req, res) => {
  try {
    const data = await propostasService.list({
      status: req.query.status as string | undefined,
      enterpriseId: req.query.enterprise_id ? Number(req.query.enterprise_id) : undefined,
    });
    res.json({ success: true, data, total: data.length });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/templates', ...staffAuth, async (req, res) => {
  try {
    const data = await propostasService.listTemplates(
      req.query.enterprise_id ? Number(req.query.enterprise_id) : undefined,
    );
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/templates', ...staffAuth, async (req, res) => {
  try {
    const body = PacoteTemplateWriteSchema.parse(req.body);
    const created = await propostasService.createTemplate(body);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    if (zodOrBad(res, error)) return;
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.get('/templates/:templateId', ...staffAuth, async (req, res) => {
  try {
    const item = await propostasService.getTemplate(Number(req.params.templateId));
    if (!item) return res.status(404).json({ success: false, error: 'Template não encontrado' });
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.put('/templates/:templateId', ...staffAuth, async (req, res) => {
  try {
    const { templateId } = TemplateIdParamSchema.parse(req.params);
    const body = PacoteTemplateUpdateSchema.parse(req.body);
    const updated = await propostasService.updateTemplate(templateId, body);
    if (!updated) return res.status(404).json({ success: false, error: 'Template não encontrado' });
    res.json({ success: true, data: updated });
  } catch (error) {
    if (zodOrBad(res, error)) return;
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.delete('/templates/:templateId', ...staffAuth, async (req, res) => {
  try {
    const deleted = await propostasService.deleteTemplate(Number(req.params.templateId));
    if (!deleted) return res.status(404).json({ success: false, error: 'Template não encontrado' });
    res.json({ success: true, data: deleted });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/from-orcamento/:orcamentoId', ...staffAuth, async (req, res) => {
  try {
    // G-D.6 / PA-DEC-006 — createFromOrcamento materializa valorTotal (efeito econômico)
    if (!canMutatePropostaEconomicFields(req.user?.role)) {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }
    const created = await propostasService.createFromOrcamento(
      Number(req.params.orcamentoId),
      req.user?.id,
    );
    recordPropostaGerada('from_orcamento');
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.get('/:token/og', publicLimiter, async (req, res, next) => {
  try {
    const token = asRequiredString(req.params.token);
    if (!token.startsWith('rt-')) return next();
    const data = await buildPropostaOgByToken(token);
    if (!data) return res.status(404).json({ success: false, error: 'Proposta não encontrada' });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/:token/recotar', publicLimiter, async (req, res) => {
  try {
    const token = asRequiredString(req.params.token);
    if (!token || /^\d+$/.test(token)) {
      return res.status(400).json({ success: false, error: 'Token público inválido' });
    }

    const data = await recotarPropostaPorToken(token);
    res.status(201).json({ success: true, data });
  } catch (error) {
    if (isPropostaRecotacaoError(error)) {
      const err = error as Error & { statusCode?: number };
      return res.status(err.statusCode ?? 403).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/:token/vouchers/:voucherId/qr.png', publicLimiter, async (req, res) => {
  try {
    const token = asRequiredString(req.params.token);
    const voucherId = asRequiredString(req.params.voucherId);
    if (!token || /^\d+$/.test(token)) {
      return res.status(400).json({ success: false, error: 'Token público inválido' });
    }

    const png = await gerarQrVoucherPng(token, voucherId);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(png);
  } catch (error) {
    if (isQrVoucherError(error)) {
      const err = error as Error & { statusCode?: number };
      return res.status(err.statusCode ?? 403).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/:token/validade', publicLimiter, optionalJwt, async (req, res) => {
  try {
    const data = await cotacaoPublicaService.getValidadeByToken(asRequiredString(req.params.token));
    if (!data) return res.status(404).json({ success: false, error: 'Proposta não encontrada' });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/:token/eventos', publicLimiter, async (req, res) => {
  try {
    const token = asRequiredString(req.params.token);
    if (!token || /^\d+$/.test(token)) {
      return res.status(400).json({ success: false, error: 'Token público inválido' });
    }

    const resolved = await resolvePropostaPublicaByToken(token);
    if (resolved.kind === 'not_found') {
      return res.status(404).json({ success: false, error: 'Proposta não encontrada' });
    }
    if (resolved.kind === 'forbidden') {
      return res.status(403).json({ success: false, error: 'Proposta não é pública' });
    }

    const body = req.body ?? {};
    const data = await registrarEventosCinematicos(resolved.propostaId, {
      session_id: String(body.session_id ?? ''),
      tempo_pagina_segundos: body.tempo_pagina_segundos,
      scroll: body.scroll,
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/:id/visualizacao', optionalJwt, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'id inválido' });
    }
    const item = await propostasService.getById(id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Nenhuma proposta encontrada' });
    }
    const authz = authorizePropostaVisualizacao({ user: req.user, row: item });
    if (!authz.ok) {
      return res.status(404).json({ success: false, error: 'Nenhuma proposta encontrada' });
    }
    await propostasService.registrarVisualizacao(id, req.user?.id);
    // Write-only: no echo of proposta / PII
    return res.status(204).send();
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/:id/revelar-comparativo', ...staffAuth, async (req, res) => {
  try {
    const data = await propostasService.revelarComparativoManual(Number(req.params.id));
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/:id/aprovacao/solicitar', ...staffAuth, async (req, res) => {
  try {
    const actor = requireAuthActor(req);
    const data = await solicitarAlteracao(Number(req.params.id), {
      id: actor.id,
      role: actor.role,
    });
    res.json({ success: true, data });
  } catch (error) {
    const err = error as Error & { statusCode?: number };
    res.status(err.statusCode ?? 400).json({ success: false, error: err.message });
  }
});

router.post('/:id/aprovacao/aprovar', ...staffAuth, async (req, res) => {
  try {
    // G-D.1 / OD-GD-04 + G-D.6 / PA-DEC-006 — admin + economic effect (voucher definitivo)
    if (!isPropostasAprovador(req.user?.role) || !canMutatePropostaEconomicFields(req.user?.role)) {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }
    const actor = requireAuthActor(req);
    const data = await aprovar(Number(req.params.id), {
      id: actor.id,
      role: req.user?.role ?? 'admin',
    });
    res.json({ success: true, data });
  } catch (error) {
    const err = error as Error & { statusCode?: number };
    res.status(err.statusCode ?? 400).json({ success: false, error: err.message });
  }
});

router.post('/:id/aprovacao/negar', ...staffAuth, async (req, res) => {
  try {
    // G-D.1 / OD-GD-04 — negação = mesma allowlist admin only
    if (!isPropostasAprovador(req.user?.role)) {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }
    const actor = requireAuthActor(req);
    const data = await negar(Number(req.params.id), {
      id: actor.id,
      role: req.user?.role ?? 'admin',
    }, String(req.body.motivo ?? ''));
    res.json({ success: true, data });
  } catch (error) {
    const err = error as Error & { statusCode?: number };
    res.status(err.statusCode ?? 400).json({ success: false, error: err.message });
  }
});

router.post('/:id/indicacao', optionalJwt, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'id inválido' });
    }
    const item = await propostasService.getById(id);
    if (!item?.tokenPublico) {
      return res.status(404).json({ success: false, error: 'Nenhuma proposta encontrada' });
    }
    if (!isPropostaStaff(req.user) && !ownsProposta(req.user, item)) {
      return res.status(404).json({ success: false, error: 'Nenhuma proposta encontrada' });
    }
    // G-D.10 / OD-GD-10 — indicadorId do body ≠ autoridade; bind ao JWT user
    const resolved = resolveIndicadorIdFromAuth({
      authenticatedUserId: req.user?.id,
      bodyIndicadorId: req.body?.indicadorId,
    });
    if (!resolved.ok) {
      return res.status(resolved.status).json({ success: false, error: 'Acesso negado' });
    }
    const data = await registrarIndicacao({
      indicadorId: resolved.indicadorId,
      tokenProposta: item.tokenPublico,
      canal: req.body.canal,
      indicadoEmail: req.body.indicadoEmail,
      indicadoTelefone: req.body.indicadoTelefone,
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/:id/ia-sugerir', ...staffAuth, async (req, res) => {
  try {
    const data = await sugerirPacoteFromProposta(Number(req.params.id));
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/:id/pacotes-template/from-proposta', ...staffAuth, async (req, res) => {
  try {
    const data = await criarTemplateFromProposta(
      Number(req.params.id),
      req.body.enterpriseId ? Number(req.body.enterpriseId) : undefined,
    );
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// PR-06b: closes 03b accepted risk — enumeration of redacted payload via GET /:id
router.get('/:id', publicLimiter, optionalJwt, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'id inválido' });
    }
    const item = await propostasService.getById(id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Nenhuma proposta encontrada' });
    }
    const decision = authorizePropostaIdRead({ user: req.user, row: item });
    if (!decision.ok) {
      return res.status(404).json({ success: false, error: 'Nenhuma proposta encontrada' });
    }
    if (decision.mode === 'redacted') {
      return res.json({
        success: true,
        data: {
          ...buildAnonymousIdLookupPayload(item),
          eventos: [],
          chat: [],
        },
      });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/', ...staffAuth, async (req, res) => {
  try {
    const body = PropostaWriteSchema.parse(req.body);
    let valorTotal: string | undefined;
    if (payloadTouchesValorTotal(body)) {
      // G-D.6 / PA-DEC-006 — body.valorTotal ≠ authority; actor + caps
      if (!canMutatePropostaEconomicFields(req.user?.role)) {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }
      const capped = normalizeValorTotalCap(body.valorTotal);
      if (!capped.ok) {
        return res.status(capped.status).json({ success: false, error: 'valorTotal inválido' });
      }
      valorTotal = capped.valorTotal;
    }
    const created = await propostasService.create(
      {
        ...body,
        ...(valorTotal !== undefined ? { valorTotal } : {}),
        ...(body.isPublica ? { tokenPublico: gerarTokenPublicoProposta() } : {}),
      },
      req.user?.id,
    );
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    if (zodOrBad(res, error)) return;
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.put('/:id', ...staffAuth, async (req, res) => {
  try {
    const { id } = PropostaIdParamSchema.parse(req.params);
    const body = PropostaUpdateSchema.parse(req.body);
    let valorTotal: string | undefined;
    if (payloadTouchesValorTotal(body)) {
      // G-D.6 / PA-DEC-006 — body.valorTotal ≠ authority; actor + caps
      if (!canMutatePropostaEconomicFields(req.user?.role)) {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }
      const capped = normalizeValorTotalCap(body.valorTotal);
      if (!capped.ok) {
        return res.status(capped.status).json({ success: false, error: 'valorTotal inválido' });
      }
      valorTotal = capped.valorTotal;
    }
    const updated = await propostasService.update(
      id,
      {
        ...body,
        ...(valorTotal !== undefined ? { valorTotal } : {}),
      },
      req.user?.id,
    );
    if (!updated) return res.status(404).json({ success: false, error: 'Proposta não encontrada' });
    res.json({ success: true, data: updated });
  } catch (error) {
    if (zodOrBad(res, error)) return;
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.patch('/:id/status', ...staffAuth, async (req, res) => {
  try {
    const updated = await propostasService.changeStatus(
      Number(req.params.id),
      req.body.status,
      req.user?.id,
    );
    if (!updated) return res.status(404).json({ success: false, error: 'Proposta não encontrada' });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.delete('/:id', ...agentAuth, async (req, res) => {
  try {
    const deleted = await propostasService.remove(Number(req.params.id));
    if (!deleted) return res.status(404).json({ success: false, error: 'Proposta não encontrada' });
    res.json({ success: true, data: deleted });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.get('/:id/chat', publicLimiter, optionalJwt, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'id inválido' });
    }
    const item = await propostasService.getById(id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Nenhuma proposta encontrada' });
    }
    const capabilityToken =
      (typeof req.query.token === 'string' && req.query.token) ||
      (typeof req.headers['x-proposta-token'] === 'string'
        ? req.headers['x-proposta-token']
        : null);
    const authz = authorizePropostaIdSensitive({
      user: req.user,
      row: item,
      capabilityToken,
    });
    if (!authz.ok) {
      return res.status(404).json({ success: false, error: 'Nenhuma proposta encontrada' });
    }
    const messages = await propostasService.listChat(id);
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/:id/chat', publicLimiter, requireTurnstile, optionalJwt, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'id inválido' });
    }
    const item = await propostasService.getById(id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Nenhuma proposta encontrada' });
    }
    const capabilityToken =
      (typeof req.body?.tokenPublico === 'string' && req.body.tokenPublico) ||
      (typeof req.headers['x-proposta-token'] === 'string'
        ? req.headers['x-proposta-token']
        : null);
    const authz = authorizePropostaIdSensitive({
      user: req.user,
      row: item,
      capabilityToken,
    });
    if (!authz.ok) {
      return res.status(404).json({ success: false, error: 'Nenhuma proposta encontrada' });
    }
    const saved = await propostasService.addChatMessage(id, req.body);
    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.get('/:id/hitl', optionalJwt, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'id inválido' });
    }
    const item = await propostasService.getById(id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Nenhuma proposta encontrada' });
    }
    const capabilityToken =
      (typeof req.query.token === 'string' && req.query.token) ||
      (typeof req.headers['x-proposta-token'] === 'string'
        ? req.headers['x-proposta-token']
        : null);
    const authz = authorizePropostaIdSensitive({
      user: req.user,
      row: item,
      capabilityToken,
    });
    if (!authz.ok) {
      return res.status(404).json({ success: false, error: 'Nenhuma proposta encontrada' });
    }
    const state = await propostasService.getHitlState(id);
    if (!state) return res.status(404).json({ success: false, error: 'Nenhuma proposta encontrada' });
    res.json({ success: true, data: state });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/:id/hitl/request', optionalJwt, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'id inválido' });
    }
    const item = await propostasService.getById(id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Nenhuma proposta encontrada' });
    }
    const capabilityToken =
      (typeof req.body?.tokenPublico === 'string' && req.body.tokenPublico) ||
      (typeof req.headers['x-proposta-token'] === 'string'
        ? req.headers['x-proposta-token']
        : null);
    const authz = authorizePropostaIdSensitive({
      user: req.user,
      row: item,
      capabilityToken,
    });
    if (!authz.ok) {
      return res.status(404).json({ success: false, error: 'Nenhuma proposta encontrada' });
    }
    const state = await propostasService.requestHitl(
      id,
      req.body.clientName ?? req.user?.name,
    );
    res.json({ success: true, data: state });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/:id/hitl/takeover', ...agentAuth, async (req, res) => {
  try {
    const actor = requireAuthActor(req);
    const state = await propostasService.takeoverHitl(Number(req.params.id), {
      id: actor.id,
      name: actor.name,
    });
    res.json({ success: true, data: state });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/:id/hitl/release', ...agentAuth, async (req, res) => {
  try {
    const state = await propostasService.releaseHitl(Number(req.params.id), req.user?.id);
    res.json({ success: true, data: state });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/:id/responder', publicLimiter, requireTurnstile, optionalJwt, async (req, res) => {
  try {
    const action = req.body.action as 'accept' | 'reject';
    if (!action || !['accept', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, error: 'action deve ser accept ou reject' });
    }
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'id inválido' });
    }
    const item = await propostasService.getById(id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Nenhuma proposta encontrada' });
    }
    // G-D.9 C1 — Accept on :id closed for guests; public accept =
    // POST /cotacao-publica/proposta/:token/aceitar (capability token).
    // Reject may use capability token; staff/owner always ok.
    if (action === 'accept') {
      if (!isPropostaStaff(req.user) && !ownsProposta(req.user, item)) {
        return res.status(404).json({ success: false, error: 'Nenhuma proposta encontrada' });
      }
    } else {
      const capabilityToken =
        (typeof req.body?.tokenPublico === 'string' && req.body.tokenPublico) ||
        (typeof req.headers['x-proposta-token'] === 'string'
          ? req.headers['x-proposta-token']
          : null);
      const authz = authorizePropostaIdSensitive({
        user: req.user,
        row: item,
        capabilityToken,
      });
      if (!authz.ok) {
        return res.status(404).json({ success: false, error: 'Nenhuma proposta encontrada' });
      }
    }
    const updated = await propostasService.respondPublic(
      id,
      action,
      req.body.clientName ?? req.user?.name,
    );
    const payload: Record<string, unknown> = { success: true, data: updated };
    if (action === 'accept' && updated?.tokenPublico) {
      payload.proximoDestino = `/roteiro/${updated.tokenPublico}`;
    }
    res.json(payload);
  } catch (error) {
    if (isPropostaExpiradaError(error)) {
      return res.status(403).json({ success: false, error: error.message });
    }
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

export default router;

module.exports = router;
