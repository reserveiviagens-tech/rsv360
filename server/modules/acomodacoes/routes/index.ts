import { Router } from 'express';
import { ZodError } from 'zod';
import { getPinnedCodigosExternos, isEtapaAHotel, montarCardsPasso2 } from '@rsv360/shared';
import { authenticateJwt, requireRole } from '../../../middleware/auth.middleware';
import { publicLimiter } from '../../../middleware/public-limiter';
import {
  acomodacoesService,
  mergeDisponiveisParaCards,
} from '../services/acomodacoes.service';
import { parsePeriodoEstadiaOpcional } from '../services/listar-disponiveis-calendario.util';
import { resolverHotelIdParaAcomodacoes } from '../services/resolve-hotel-id';
import { AddonPatchSchema } from '../schemas/write-allowlist.schema';

const router = Router();
const staffAuth = [authenticateJwt, requireRole('admin', 'manager', 'user')];
const adminAuth = [authenticateJwt, requireRole('admin')];

router.get('/health', (_req, res) => {
  res.json({ module: 'acomodacoes', status: 'ok' });
});

/** Público — anúncio por token de pré-visualização (/h/preview/[token]). */
router.get('/publico/preview/:token', publicLimiter, async (req, res) => {
  try {
    const data = await acomodacoesService.obterPublicoPorPreviewToken(
      String(req.params.token ?? ''),
    );
    if (!data) {
      return res.status(404).json({ success: false, error: 'Anúncio não encontrado' });
    }
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** Público — anúncio por slug personalizado (/h/[slug]). */
router.get('/publico/by-slug/:slug', publicLimiter, async (req, res) => {
  try {
    const data = await acomodacoesService.obterPublicoPorSlug(String(req.params.slug ?? ''));
    if (!data) {
      return res.status(404).json({ success: false, error: 'Anúncio não encontrado' });
    }
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** Público — listagem paginada para wizard Passo 2 (filtro no banco). */
router.get('/disponiveis', publicLimiter, async (req, res) => {
  try {
    const hotelIdRaw = String(req.query.hotelId ?? '');
    const titulo = req.query.titulo != null ? String(req.query.titulo) : undefined;
    const hospedesQuery = Number(req.query.hospedes ?? 2);
    const adults = Number(req.query.adults ?? hospedesQuery);
    const children = Number(req.query.children ?? 0);
    const perfil = String(req.query.perfil ?? 'casal') as 'familia' | 'casal' | 'aventura';
    const page = Number(req.query.page ?? 1);

    if (!hotelIdRaw) {
      return res.status(400).json({ success: false, error: 'hotelId é obrigatório' });
    }

    const hotelId = await resolverHotelIdParaAcomodacoes(hotelIdRaw, titulo);

    const periodoRaw = parsePeriodoEstadiaOpcional(
      req.query.checkIn != null ? String(req.query.checkIn) : undefined,
      req.query.checkOut != null ? String(req.query.checkOut) : undefined,
    );
    if (periodoRaw && 'error' in periodoRaw) {
      return res.status(400).json({ success: false, error: periodoRaw.error });
    }
    const periodo = periodoRaw && !('error' in periodoRaw) ? periodoRaw : null;

    const hospedes = adults + children;
    const listed = await acomodacoesService.listarDisponiveis({
      hotelId,
      hospedes,
      page,
      checkIn: periodo?.checkIn,
      checkOut: periodo?.checkOut,
    });

    let cardInput = listed.items;
    if (isEtapaAHotel(hotelId)) {
      const pinCodigos = getPinnedCodigosExternos(hotelId, perfil, adults, children);
      if (pinCodigos?.length) {
        const pinItems = await acomodacoesService.listarPinsPublicadosPorCodigo({
          hotelId,
          codigosExternos: pinCodigos,
          hospedes,
          checkIn: periodo?.checkIn,
          checkOut: periodo?.checkOut,
        });
        cardInput = mergeDisponiveisParaCards(listed.items, pinItems);
      }
    }

    const cards =
      cardInput.length > 0
        ? montarCardsPasso2(perfil, adults, children, cardInput, hotelId)
        : [];

    res.json({
      success: true,
      data: {
        ...listed,
        hotelIdResolvido: hotelId,
        cards,
        fallbackHotelUnico: listed.items.length === 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/addons', publicLimiter, async (_req, res) => {
  try {
    const rows = await acomodacoesService.listarAddons('hotel');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/admin/tipos', ...adminAuth, async (_req, res) => {
  try {
    const data = await acomodacoesService.listarTipos();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/admin/tipos', ...adminAuth, async (req, res) => {
  try {
    const { slug, nome, icone, ordem } = req.body ?? {};
    if (!slug || !nome) return res.status(400).json({ success: false, error: 'slug e nome obrigatórios' });
    const data = await acomodacoesService.criarTipo({ slug, nome, icone, ordem });
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.patch('/admin/tipos/:id', ...adminAuth, async (req, res) => {
  try {
    const data = await acomodacoesService.atualizarTipo(Number(req.params.id), req.body ?? {});
    if (!data) return res.status(404).json({ success: false, error: 'Tipo não encontrado' });
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.get('/admin/addons', ...adminAuth, async (_req, res) => {
  try {
    const data = await acomodacoesService.listarAddons('hotel');
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/admin/addons', ...adminAuth, async (req, res) => {
  try {
    const { nome, descricao, precoTipo, valor, escopo, requerConfigBanheiro, ordem } = req.body ?? {};
    if (!nome || !precoTipo || valor == null) {
      return res.status(400).json({ success: false, error: 'nome, precoTipo e valor obrigatórios' });
    }
    const data = await acomodacoesService.criarAddon({
      nome,
      descricao,
      precoTipo,
      valor: String(valor),
      escopo,
      requerConfigBanheiro,
      ordem,
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.patch('/admin/addons/:id', ...adminAuth, async (req, res) => {
  try {
    const parsed = AddonPatchSchema.parse(req.body);
    const patch: {
      nome?: string;
      descricao?: string;
      precoTipo?: string;
      valor?: string;
      ativo?: boolean;
      ordem?: number;
    } = {};
    if (parsed.nome !== undefined) patch.nome = parsed.nome;
    if (parsed.descricao !== undefined && parsed.descricao !== null) patch.descricao = parsed.descricao;
    if (parsed.precoTipo !== undefined) patch.precoTipo = parsed.precoTipo;
    if (parsed.valor !== undefined) patch.valor = String(parsed.valor);
    if (parsed.ativo !== undefined) patch.ativo = parsed.ativo;
    if (parsed.ordem !== undefined) patch.ordem = parsed.ordem;
    const data = await acomodacoesService.atualizarAddon(Number(req.params.id), patch);
    if (!data) return res.status(404).json({ success: false, error: 'Addon não encontrado' });
    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
    }
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.delete('/admin/addons/:id', ...adminAuth, async (req, res) => {
  try {
    const data = await acomodacoesService.excluirAddon(Number(req.params.id));
    if (!data) return res.status(404).json({ success: false, error: 'Addon não encontrado' });
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

export default router;
module.exports = router;
