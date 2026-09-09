const { getJwtSecret } = require('@rsv360/shared');
const express = require('express');
const { extractBearerToken, verifyAccessToken } = require('../auth/jwt-verify');
const {
  isAuctionsDbEnabled,
  listAuctions,
  listActiveAuctions,
  getAuctionMapData,
  getAuctionById,
  listBids,
  placeBid,
  createAuction,
  updateAuction,
} = require('./service');

const router = express.Router();

function resolveBearerUser(req) {
  const token = extractBearerToken(req);
  if (!token) return null;
  const secret = getJwtSecret();
  const payload = verifyAccessToken(token, secret);
  if (!payload) return null;
  const userId = payload.userId ?? payload.sub ?? payload.id;
  if (!userId) return null;
  return {
    userId: Number(userId),
    email: payload.email,
    name: payload.name,
  };
}

function requireDb(res) {
  if (!isAuctionsDbEnabled()) {
    res.status(501).json({
      success: false,
      error: 'Leilões indisponíveis. Configure DATABASE_URL.',
    });
    return false;
  }
  return true;
}

/** GET /api/v1/auctions — lista paginada */
router.get('/', async (req, res) => {
  if (!requireDb(res)) return;

  try {
    const result = await listAuctions({
      status: req.query.status,
      enterprise_id: req.query.enterprise_id,
      property_id: req.query.property_id,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
    });

    return res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('[AUCTIONS] list error:', error.message);
    return res.status(503).json({ success: false, error: 'Serviço temporariamente indisponível' });
  }
});

/** GET /api/v1/auctions/active — leilões ativos (site-publico) */
router.get('/active', async (req, res) => {
  if (!requireDb(res)) return;

  try {
    const data = await listActiveAuctions({
      enterprise_id: req.query.enterprise_id,
      search: req.query.search,
    });
    return res.json(data);
  } catch (error) {
    console.error('[AUCTIONS] active error:', error.message);
    return res.status(503).json({ success: false, error: 'Serviço temporariamente indisponível' });
  }
});

/** GET /api/v1/auctions/map-data — marcadores do mapa */
router.get('/map-data', async (req, res) => {
  if (!requireDb(res)) return;

  try {
    const data = await getAuctionMapData();
    return res.json(data);
  } catch (error) {
    console.error('[AUCTIONS] map-data error:', error.message);
    return res.status(503).json({ success: false, error: 'Serviço temporariamente indisponível' });
  }
});

/** POST /api/v1/auctions — criar leilão */
router.post('/', async (req, res) => {
  if (!requireDb(res)) return;

  const bearer = resolveBearerUser(req);
  if (!bearer) {
    return res.status(401).json({ success: false, error: 'Token ausente ou inválido' });
  }

  try {
    const result = await createAuction(req.body);
    if (result?.error) {
      return res.status(result.status).json({ success: false, error: result.message });
    }
    return res.status(201).json({ success: true, data: result.auction });
  } catch (error) {
    console.error('[AUCTIONS] create error:', error.message);
    return res.status(503).json({ success: false, error: 'Serviço temporariamente indisponível' });
  }
});

/** GET /api/v1/auctions/:id/bids — histórico de lances */
router.get('/:id/bids', async (req, res) => {
  if (!requireDb(res)) return;

  const auctionId = parseInt(req.params.id, 10);
  if (!Number.isFinite(auctionId)) {
    return res.status(400).json({ success: false, error: 'ID inválido' });
  }

  try {
    const auction = await getAuctionById(auctionId);
    if (!auction) {
      return res.status(404).json({ success: false, error: 'Leilão não encontrado' });
    }
    const data = await listBids(auctionId);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[AUCTIONS] bids list error:', error.message);
    return res.status(503).json({ success: false, error: 'Serviço temporariamente indisponível' });
  }
});

/** POST /api/v1/auctions/:id/bids — registrar lance */
router.post('/:id/bids', async (req, res) => {
  if (!requireDb(res)) return;

  const bearer = resolveBearerUser(req);
  if (!bearer) {
    return res.status(401).json({ success: false, message: 'Autenticação necessária para dar lance' });
  }

  const auctionId = parseInt(req.params.id, 10);
  if (!Number.isFinite(auctionId)) {
    return res.status(400).json({ success: false, message: 'ID inválido' });
  }

  try {
    const result = await placeBid(auctionId, bearer, req.body?.amount);
    if (result?.error) {
      return res.status(result.status).json({ success: false, message: result.message });
    }
    return res.status(201).json({ success: true, data: result.bid });
  } catch (error) {
    console.error('[AUCTIONS] bid error:', error.message);
    return res.status(503).json({ success: false, message: 'Serviço temporariamente indisponível' });
  }
});

/** GET /api/v1/auctions/:id — detalhe */
router.get('/:id', async (req, res) => {
  if (!requireDb(res)) return;

  const auctionId = parseInt(req.params.id, 10);
  if (!Number.isFinite(auctionId)) {
    return res.status(400).json({ success: false, error: 'ID inválido' });
  }

  try {
    const auction = await getAuctionById(auctionId);
    if (!auction) {
      return res.status(404).json({ success: false, error: 'Leilão não encontrado' });
    }
    return res.json(auction);
  } catch (error) {
    console.error('[AUCTIONS] get error:', error.message);
    return res.status(503).json({ success: false, error: 'Serviço temporariamente indisponível' });
  }
});

/** POST /api/v1/auctions/:id/finalize — enfileira fechamento (hold + booking) */
router.post('/:id/finalize', async (req, res) => {
  if (!requireDb(res)) return;

  const auctionId = parseInt(req.params.id, 10);
  if (!Number.isFinite(auctionId)) {
    return res.status(400).json({ success: false, error: 'ID inválido' });
  }

  const bearer = resolveBearerUser(req);
  if (!bearer) {
    return res.status(401).json({ success: false, error: 'Token ausente ou inválido' });
  }

  try {
    const { enfileirarFinalizeAuction } = require('../../../../../server/modules/auctions/auctions.queue');
    const { queryDatabase } = require('../auth/refresh-token.service');
    const jobId = await enfileirarFinalizeAuction(auctionId);
    await queryDatabase(`UPDATE auctions SET finalize_job_id = $1 WHERE id = $2`, [
      jobId,
      auctionId,
    ]);
    return res.status(202).json({
      success: true,
      message: 'Fechamento enfileirado',
      data: { jobId, auctionId },
    });
  } catch (error) {
    console.error('[AUCTIONS] finalize enqueue error:', error.message);
    return res.status(503).json({
      success: false,
      error: 'Fila indisponível. Verifique REDIS_URL.',
    });
  }
});

/** POST /api/v1/auctions/:id/settle — enfileira settle de pagamento (paid|cancelled|expired) */
router.post('/:id/settle', async (req, res) => {
  if (!requireDb(res)) return;

  const auctionId = parseInt(req.params.id, 10);
  if (!Number.isFinite(auctionId)) {
    return res.status(400).json({ success: false, error: 'ID inválido' });
  }

  const bearer = resolveBearerUser(req);
  if (!bearer) {
    return res.status(401).json({ success: false, error: 'Token ausente ou inválido' });
  }

  const outcome = String(req.body?.outcome || '').toLowerCase();
  if (!['paid', 'cancelled', 'expired'].includes(outcome)) {
    return res.status(400).json({
      success: false,
      error: 'outcome deve ser paid|cancelled|expired',
    });
  }

  try {
    const { enfileirarSettlePayment } = require('../../../../../server/modules/auctions/auctions.queue');
    const jobId = await enfileirarSettlePayment(auctionId, outcome);
    return res.status(202).json({
      success: true,
      message: 'Settlement enfileirado',
      data: { jobId, auctionId, outcome },
    });
  } catch (error) {
    console.error('[AUCTIONS] settle enqueue error:', error.message);
    return res.status(503).json({
      success: false,
      error: 'Fila indisponível. Verifique REDIS_URL.',
    });
  }
});

/** PUT /api/v1/auctions/:id — atualizar leilão (admin/staff) */
router.put('/:id', async (req, res) => {
  if (!requireDb(res)) return;

  const auctionId = parseInt(req.params.id, 10);
  if (!Number.isFinite(auctionId)) {
    return res.status(400).json({ success: false, error: 'ID inválido' });
  }

  const bearer = resolveBearerUser(req);
  if (!bearer) {
    return res.status(401).json({ success: false, error: 'Token ausente ou inválido' });
  }

  try {
    const result = await updateAuction(auctionId, req.body || {});
    if (result?.error) {
      return res.status(result.status).json({ success: false, error: result.message });
    }
    return res.json({ success: true, data: result.auction });
  } catch (error) {
    console.error('[AUCTIONS] update error:', error.message);
    return res.status(503).json({ success: false, error: 'Serviço temporariamente indisponível' });
  }
});

module.exports = { auctionsRouter: router };
