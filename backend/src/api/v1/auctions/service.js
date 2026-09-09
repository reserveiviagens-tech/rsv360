const { queryDatabase } = require('../auth/refresh-token.service');

function isAuctionsDbEnabled() {
  return Boolean(process.env.DATABASE_URL);
}

function parsePositiveInt(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseDecimal(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapAuctionRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    enterprise_id: row.enterprise_id,
    property_id: row.property_id,
    accommodation_id: row.accommodation_id,
    title: row.title,
    description: row.description,
    start_price: Number(row.start_price),
    current_price: Number(row.current_price),
    min_increment: Number(row.min_increment),
    reserve_price: row.reserve_price != null ? Number(row.reserve_price) : undefined,
    start_date: row.start_date,
    end_date: row.end_date,
    status: row.status,
    winner_id: row.winner_id,
    winner_bid_id: row.winner_bid_id,
    acomodacao_id: row.acomodacao_id != null ? Number(row.acomodacao_id) : undefined,
    stay_check_in: row.stay_check_in,
    stay_check_out: row.stay_check_out,
    booking_id: row.booking_id != null ? Number(row.booking_id) : undefined,
    settlement_status: row.settlement_status || 'none',
    payment_due_at: row.payment_due_at,
    finalize_job_id: row.finalize_job_id,
    latitude: row.latitude != null ? Number(row.latitude) : undefined,
    longitude: row.longitude != null ? Number(row.longitude) : undefined,
    image_url: row.image_url,
    total_bids: row.total_bids != null ? Number(row.total_bids) : undefined,
    highest_bid: row.highest_bid != null ? Number(row.highest_bid) : undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapBidRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    auction_id: row.auction_id,
    customer_id: row.customer_id,
    amount: Number(row.amount),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    customer_name: row.customer_name,
    customer_email: row.customer_email,
  };
}

async function syncAuctionStatuses() {
  // Lightweight status flip only — settlement is owned by BullMQ workers (no hold/booking here).
  const now = new Date().toISOString();
  await queryDatabase(
    `UPDATE auctions SET status = 'active', updated_at = CURRENT_TIMESTAMP
     WHERE status = 'scheduled' AND start_date <= $1 AND end_date > $1`,
    [now]
  );
  // Do NOT mark finished here; scanner enqueues finalize which sets finished + settlement.
}

async function listAuctions(filters = {}) {
  await syncAuctionStatuses();

  const page = parsePositiveInt(filters.page, 1);
  const limit = Math.min(parsePositiveInt(filters.limit, 12), 100);
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];
  let idx = 1;

  if (filters.status) {
    conditions.push(`a.status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters.enterprise_id) {
    conditions.push(`a.enterprise_id = $${idx++}`);
    params.push(filters.enterprise_id);
  }
  if (filters.property_id) {
    conditions.push(`a.property_id = $${idx++}`);
    params.push(filters.property_id);
  }
  if (filters.search) {
    conditions.push(`(a.title ILIKE $${idx} OR a.description ILIKE $${idx})`);
    params.push(`%${filters.search}%`);
    idx += 1;
  }
  if (filters.minPrice != null) {
    conditions.push(`a.current_price >= $${idx++}`);
    params.push(filters.minPrice);
  }
  if (filters.maxPrice != null) {
    conditions.push(`a.current_price <= $${idx++}`);
    params.push(filters.maxPrice);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRows = await queryDatabase(
    `SELECT COUNT(*)::int AS total FROM auctions a ${where}`,
    params
  );
  const total = countRows?.[0]?.total ?? 0;

  const rows = await queryDatabase(
    `SELECT a.*,
            COUNT(b.id)::int AS total_bids,
            MAX(b.amount) AS highest_bid
     FROM auctions a
     LEFT JOIN bids b ON b.auction_id = a.id
     ${where}
     GROUP BY a.id
     ORDER BY a.end_date ASC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );

  return {
    data: (rows || []).map(mapAuctionRow),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    },
  };
}

async function listActiveAuctions(filters = {}) {
  await syncAuctionStatuses();
  const conditions = [`a.status = 'active'`];
  const params = [];
  let idx = 1;

  if (filters.enterprise_id) {
    conditions.push(`a.enterprise_id = $${idx++}`);
    params.push(filters.enterprise_id);
  }
  if (filters.search) {
    conditions.push(`(a.title ILIKE $${idx} OR a.description ILIKE $${idx})`);
    params.push(`%${filters.search}%`);
    idx += 1;
  }

  const rows = await queryDatabase(
    `SELECT a.*,
            COUNT(b.id)::int AS total_bids,
            MAX(b.amount) AS highest_bid
     FROM auctions a
     LEFT JOIN bids b ON b.auction_id = a.id
     WHERE ${conditions.join(' AND ')}
     GROUP BY a.id
     ORDER BY a.end_date ASC`,
    params
  );

  return (rows || []).map(mapAuctionRow);
}

async function getAuctionMapData() {
  await syncAuctionStatuses();
  const rows = await queryDatabase(
    `SELECT id, latitude AS lat, longitude AS lng, title, current_price, status
     FROM auctions
     WHERE status = 'active' AND latitude IS NOT NULL AND longitude IS NOT NULL
     ORDER BY end_date ASC`
  );
  return (rows || []).map((row) => ({
    id: row.id,
    lat: Number(row.lat),
    lng: Number(row.lng),
    title: row.title,
    current_price: Number(row.current_price),
    status: row.status,
  }));
}

async function getAuctionById(id) {
  await syncAuctionStatuses();
  const rows = await queryDatabase(
    `SELECT a.*,
            COUNT(b.id)::int AS total_bids,
            MAX(b.amount) AS highest_bid
     FROM auctions a
     LEFT JOIN bids b ON b.auction_id = a.id
     WHERE a.id = $1
     GROUP BY a.id`,
    [id]
  );
  return mapAuctionRow(rows?.[0]);
}

async function listBids(auctionId) {
  const rows = await queryDatabase(
    `SELECT b.*, c.name AS customer_name, c.email AS customer_email
     FROM bids b
     LEFT JOIN customers c ON c.id = b.customer_id
     WHERE b.auction_id = $1
     ORDER BY b.amount DESC, b.created_at DESC`,
    [auctionId]
  );
  return (rows || []).map(mapBidRow);
}

async function resolveCustomerForUser({ userId, email, name }) {
  const existing = await queryDatabase('SELECT id FROM customers WHERE user_id = $1', [userId]);
  if (existing?.[0]?.id) return existing[0].id;

  const safeEmail = email || `user${userId}@local.dev`;
  const safeName = name || `Usuário ${userId}`;

  const byEmail = await queryDatabase('SELECT id, user_id FROM customers WHERE email = $1', [
    safeEmail,
  ]);
  if (byEmail?.[0]?.id) {
    if (!byEmail[0].user_id) {
      await queryDatabase('UPDATE customers SET user_id = $1 WHERE id = $2', [
        userId,
        byEmail[0].id,
      ]);
    }
    return byEmail[0].id;
  }

  const inserted = await queryDatabase(
    `INSERT INTO customers (user_id, name, email, is_active, is_verified)
     VALUES ($1, $2, $3, true, false)
     RETURNING id`,
    [userId, safeName, safeEmail]
  );
  return inserted?.[0]?.id ?? null;
}

async function placeBid(auctionId, user, amount) {
  const bidAmount = parseDecimal(amount);
  if (bidAmount == null || bidAmount <= 0) {
    return { error: 'validation', status: 400, message: 'Valor do lance inválido' };
  }

  const auction = await getAuctionById(auctionId);
  if (!auction) {
    return { error: 'not_found', status: 404, message: 'Leilão não encontrado' };
  }
  if (auction.status !== 'active') {
    return { error: 'validation', status: 400, message: 'Leilão não está ativo para lances' };
  }

  const minAllowed = Number(auction.current_price) + Number(auction.min_increment);
  if (bidAmount < minAllowed) {
    return {
      error: 'validation',
      status: 400,
      message: `Lance mínimo: R$ ${minAllowed.toFixed(2)}`,
    };
  }

  const customerId = await resolveCustomerForUser(user);
  if (!customerId) {
    return { error: 'validation', status: 400, message: 'Não foi possível identificar o cliente' };
  }

  await queryDatabase(
    `UPDATE bids SET status = 'outbid', updated_at = CURRENT_TIMESTAMP
     WHERE auction_id = $1 AND status = 'accepted'`,
    [auctionId]
  );

  const inserted = await queryDatabase(
    `INSERT INTO bids (auction_id, customer_id, amount, status)
     VALUES ($1, $2, $3, 'accepted')
     RETURNING *`,
    [auctionId, customerId, bidAmount]
  );

  const bid = inserted?.[0];
  if (!bid) {
    return { error: 'server', status: 503, message: 'Não foi possível registrar o lance' };
  }

  await queryDatabase(
    `UPDATE auctions
     SET current_price = $1, winner_id = $2, winner_bid_id = $3, updated_at = CURRENT_TIMESTAMP
     WHERE id = $4`,
    [bidAmount, customerId, bid.id, auctionId]
  );

  const rows = await queryDatabase(
    `SELECT b.*, c.name AS customer_name, c.email AS customer_email
     FROM bids b
     LEFT JOIN customers c ON c.id = b.customer_id
     WHERE b.id = $1`,
    [bid.id]
  );

  const mappedBid = mapBidRow(rows?.[0]);
  try {
    const { notifyAuctionBidPlaced } = require('../../../../server/modules/notifications/notification-hooks');
    notifyAuctionBidPlaced({
      auction,
      bid: mappedBid,
      user,
      customerEmail: mappedBid?.customer_email || user?.email,
      customerName: mappedBid?.customer_name || user?.name,
    });
  } catch {
    /* hub optional */
  }

  return { bid: mappedBid };
}

async function createAuction(payload) {
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const startPrice = parseDecimal(payload.start_price ?? payload.starting_price);
  const startDate = payload.start_date;
  const endDate = payload.end_date;
  const acomodacaoId = parsePositiveInt(payload.acomodacao_id, null);
  const stayCheckIn = payload.stay_check_in ? String(payload.stay_check_in).slice(0, 10) : null;
  const stayCheckOut = payload.stay_check_out ? String(payload.stay_check_out).slice(0, 10) : null;

  if (!title || startPrice == null || !startDate || !endDate) {
    return {
      error: 'validation',
      status: 400,
      message: 'title, start_price, start_date e end_date são obrigatórios',
    };
  }

  if (!acomodacaoId || !stayCheckIn || !stayCheckOut) {
    return {
      error: 'validation',
      status: 400,
      message: 'acomodacao_id, stay_check_in e stay_check_out são obrigatórios',
    };
  }

  if (new Date(stayCheckOut) <= new Date(stayCheckIn)) {
    return {
      error: 'validation',
      status: 400,
      message: 'stay_check_out deve ser posterior a stay_check_in',
    };
  }

  try {
    const { assertStayAvailable } = require('../../../../../server/modules/auctions/auction-settlement.service');
    const avail = await assertStayAvailable(acomodacaoId, stayCheckIn, stayCheckOut);
    if (!avail.ok) {
      return { error: 'conflict', status: 409, message: avail.message };
    }
  } catch (err) {
    console.warn('[AUCTIONS] assertStayAvailable:', err.message);
  }

  const minIncrement = parseDecimal(payload.min_increment) ?? 10;
  const currentPrice = parseDecimal(payload.current_price) ?? startPrice;

  const rows = await queryDatabase(
    `INSERT INTO auctions (
       enterprise_id, property_id, accommodation_id, acomodacao_id,
       title, description,
       start_price, current_price, min_increment, reserve_price,
       start_date, end_date, stay_check_in, stay_check_out,
       status, settlement_status, latitude, longitude, image_url
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'none', $16, $17, $18)
     RETURNING *`,
    [
      payload.enterprise_id ?? null,
      payload.property_id ?? null,
      payload.accommodation_id ?? null,
      acomodacaoId,
      title,
      payload.description ?? null,
      startPrice,
      currentPrice,
      minIncrement,
      payload.reserve_price ?? null,
      startDate,
      endDate,
      stayCheckIn,
      stayCheckOut,
      payload.status ?? 'scheduled',
      payload.latitude ?? null,
      payload.longitude ?? null,
      payload.image_url ?? null,
    ]
  );

  return { auction: mapAuctionRow(rows?.[0]) };
}

function normalizeAuctionStatus(status) {
  if (status == null || status === '') return undefined;
  const raw = String(status).toLowerCase();
  if (raw === 'ended') return 'finished';
  return raw;
}

async function updateAuction(auctionId, payload = {}) {
  const existing = await getAuctionById(auctionId);
  if (!existing) {
    return { error: 'not_found', status: 404, message: 'Leilão não encontrado' };
  }

  const title =
    payload.title !== undefined
      ? typeof payload.title === 'string'
        ? payload.title.trim()
        : ''
      : undefined;
  if (title !== undefined && !title) {
    return { error: 'validation', status: 400, message: 'title não pode ser vazio' };
  }

  const startPrice =
    payload.start_price !== undefined || payload.starting_price !== undefined
      ? parseDecimal(payload.start_price ?? payload.starting_price)
      : undefined;
  if (startPrice !== undefined && (startPrice == null || startPrice <= 0)) {
    return { error: 'validation', status: 400, message: 'start_price inválido' };
  }

  const startDate = payload.start_date !== undefined ? payload.start_date : undefined;
  const endDate = payload.end_date !== undefined ? payload.end_date : undefined;
  if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
    return {
      error: 'validation',
      status: 400,
      message: 'end_date deve ser posterior a start_date',
    };
  }

  const status = normalizeAuctionStatus(payload.status);
  const allowedStatus = new Set(['scheduled', 'active', 'finished', 'cancelled']);
  if (status !== undefined && !allowedStatus.has(status)) {
    return { error: 'validation', status: 400, message: 'status inválido' };
  }

  const sets = [];
  const params = [];
  let idx = 1;
  const assign = (column, value) => {
    if (value === undefined) return;
    sets.push(`${column} = $${idx++}`);
    params.push(value);
  };

  assign('title', title);
  if (payload.description !== undefined) {
    assign('description', payload.description);
  }
  assign('start_price', startPrice);
  if (payload.reserve_price !== undefined) {
    assign('reserve_price', parseDecimal(payload.reserve_price));
  }
  if (payload.min_increment !== undefined) {
    assign('min_increment', parseDecimal(payload.min_increment) ?? 10);
  }
  assign('start_date', startDate);
  assign('end_date', endDate);
  assign('status', status);
  if (payload.property_id !== undefined) {
    assign('property_id', payload.property_id);
  }
  if (payload.accommodation_id !== undefined) {
    assign('accommodation_id', payload.accommodation_id);
  }
  if (payload.acomodacao_id !== undefined) {
    assign('acomodacao_id', parsePositiveInt(payload.acomodacao_id, null));
  }
  if (payload.stay_check_in !== undefined) {
    assign('stay_check_in', payload.stay_check_in ? String(payload.stay_check_in).slice(0, 10) : null);
  }
  if (payload.stay_check_out !== undefined) {
    assign('stay_check_out', payload.stay_check_out ? String(payload.stay_check_out).slice(0, 10) : null);
  }
  if (payload.image_url !== undefined) {
    assign('image_url', payload.image_url);
  }

  const nextAcomodacao =
    payload.acomodacao_id !== undefined
      ? parsePositiveInt(payload.acomodacao_id, null)
      : existing.acomodacao_id;
  const nextIn =
    payload.stay_check_in !== undefined
      ? String(payload.stay_check_in).slice(0, 10)
      : existing.stay_check_in
        ? String(existing.stay_check_in).slice(0, 10)
        : null;
  const nextOut =
    payload.stay_check_out !== undefined
      ? String(payload.stay_check_out).slice(0, 10)
      : existing.stay_check_out
        ? String(existing.stay_check_out).slice(0, 10)
        : null;

  if (
    nextAcomodacao &&
    nextIn &&
    nextOut &&
    (payload.acomodacao_id !== undefined ||
      payload.stay_check_in !== undefined ||
      payload.stay_check_out !== undefined)
  ) {
    try {
      const { assertStayAvailable } = require('../../../../../server/modules/auctions/auction-settlement.service');
      const avail = await assertStayAvailable(nextAcomodacao, nextIn, nextOut);
      if (!avail.ok) {
        return { error: 'conflict', status: 409, message: avail.message };
      }
    } catch (err) {
      console.warn('[AUCTIONS] assertStayAvailable update:', err.message);
    }
  }

  if (sets.length === 0) {
    return { auction: existing };
  }

  sets.push('updated_at = CURRENT_TIMESTAMP');
  params.push(auctionId);

  const rows = await queryDatabase(
    `UPDATE auctions SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );

  const updated = mapAuctionRow(rows?.[0]);

  // Admin "Finalizar" → enqueue settlement (non-blocking)
  if (status === 'finished' && existing.settlement_status === 'none') {
    try {
      const { enfileirarFinalizeAuction } = require('../../../../../server/modules/auctions/auctions.queue');
      const jobId = await enfileirarFinalizeAuction(auctionId);
      await queryDatabase(`UPDATE auctions SET finalize_job_id = $1 WHERE id = $2`, [jobId, auctionId]);
      if (updated) updated.finalize_job_id = jobId;
    } catch (err) {
      console.warn('[AUCTIONS] enqueue finalize on update:', err.message);
    }
  }

  return { auction: updated };
}

module.exports = {
  isAuctionsDbEnabled,
  listAuctions,
  listActiveAuctions,
  getAuctionMapData,
  getAuctionById,
  listBids,
  placeBid,
  createAuction,
  updateAuction,
};
