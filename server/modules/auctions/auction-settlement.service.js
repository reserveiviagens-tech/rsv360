/**
 * Auction settlement — finalize / hold inventory / booking pending / release.
 * Uses raw SQL via queryDatabase (same pool as auctions API).
 */
const { Pool } = require('pg');
const {
  queryDatabase,
} = require('../../../backend/src/api/v1/auth/refresh-token.service');

let localPool = null;
function getSettlementPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!localPool) {
    localPool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return localPool;
}

async function withTransaction(fn) {
  const pool = getSettlementPool();
  if (!pool) throw new Error('DATABASE_URL ausente');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    client.release();
  }
}

function paymentDueHours() {
  const n = parseInt(String(process.env.AUCTION_PAYMENT_DUE_HOURS || '24'), 10);
  return Number.isFinite(n) && n > 0 ? n : 24;
}

function listStayNights(checkIn, checkOut) {
  const start = new Date(`${checkIn}T12:00:00.000Z`);
  const end = new Date(`${checkOut}T12:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return [];
  }
  const nights = [];
  const cursor = new Date(start);
  while (cursor < end) {
    nights.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return nights;
}

async function assertStayAvailable(acomodacaoId, checkIn, checkOut) {
  const nights = listStayNights(checkIn, checkOut);
  if (nights.length === 0) {
    return { ok: false, message: 'stay_check_in/stay_check_out inválidos' };
  }

  const unit = await queryDatabase(
    `SELECT id, titulo, ativo FROM acomodacoes WHERE id = $1 LIMIT 1`,
    [acomodacaoId]
  );
  if (!unit?.[0]) {
    return { ok: false, message: 'acomodacao_id não encontrada' };
  }
  if (unit[0].ativo === false) {
    return { ok: false, message: 'acomodação inativa' };
  }

  const blocked = await queryDatabase(
    `SELECT data::text AS data
     FROM disponibilidade_acomodacao
     WHERE acomodacao_id = $1
       AND data = ANY($2::date[])
       AND disponivel = false`,
    [acomodacaoId, nights]
  );
  if (blocked?.length) {
    return {
      ok: false,
      message: `Datas indisponíveis: ${blocked.map((r) => r.data).join(', ')}`,
      datasIndisponiveis: blocked.map((r) => r.data),
    };
  }
  return { ok: true, titulo: unit[0].titulo, nights };
}

async function holdNights(client, acomodacaoId, nights) {
  for (const data of nights) {
    const lockKey = `rsv360:auction-hold:v1:${acomodacaoId}:${data}`;
    await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [lockKey]);

    const claimed = await client.query(
      `INSERT INTO disponibilidade_acomodacao
         (acomodacao_id, data, disponivel, observacao, atualizado_em)
       VALUES ($1, $2::date, false, 'reservado', CURRENT_TIMESTAMP)
       ON CONFLICT (acomodacao_id, data) DO UPDATE
       SET disponivel = false,
           observacao = 'reservado',
           atualizado_em = CURRENT_TIMESTAMP
       WHERE disponibilidade_acomodacao.disponivel = true
       RETURNING data`,
      [acomodacaoId, data]
    );
    if (!claimed.rows?.length) {
      const err = new Error(`Noite indisponível: ${data}`);
      err.code = 'HOLD_CONFLICT';
      err.data = data;
      throw err;
    }
  }
}

async function releaseNights(acomodacaoId, checkIn, checkOut) {
  const nights = listStayNights(checkIn, checkOut);
  if (!nights.length) return;
  await queryDatabase(
    `UPDATE disponibilidade_acomodacao
     SET disponivel = true,
         observacao = NULL,
         atualizado_em = CURRENT_TIMESTAMP
     WHERE acomodacao_id = $1
       AND data = ANY($2::date[])
       AND observacao = 'reservado'`,
    [acomodacaoId, nights]
  );
}

function bookingCode() {
  return `AUC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

async function resolveWinnerUser(customerId) {
  const rows = await queryDatabase(
    `SELECT id, user_id, name, email, phone FROM customers WHERE id = $1 LIMIT 1`,
    [customerId]
  );
  const customer = rows?.[0];
  if (!customer) return null;

  let userId = customer.user_id;
  if (!userId && customer.email) {
    const users = await queryDatabase(
      `SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1`,
      [customer.email]
    );
    userId = users?.[0]?.id ?? null;
  }
  if (!userId) {
    const fallback = parseInt(String(process.env.AUCTION_BOOKING_FALLBACK_USER_ID || ''), 10);
    if (Number.isFinite(fallback) && fallback > 0) userId = fallback;
  }
  if (!userId) return null;

  return {
    userId,
    name: customer.name || 'Arrematante',
    email: customer.email || 'arremate@local.dev',
    phone: customer.phone || null,
  };
}

/**
 * Idempotent finalize: finished + hold + pending booking when there is a winner.
 */
async function finalizeAuction(auctionId) {
  const id = parseInt(String(auctionId), 10);
  if (!Number.isFinite(id)) {
    return { error: 'validation', status: 400, message: 'ID inválido' };
  }

  try {
    const result = await withTransaction(async (client) => {
      const locked = await client.query(`SELECT * FROM auctions WHERE id = $1 FOR UPDATE`, [id]);
      const auction = locked.rows?.[0];
      if (!auction) {
        return { error: 'not_found', status: 404, message: 'Leilão não encontrado' };
      }

      if (auction.settlement_status && auction.settlement_status !== 'none') {
        return { skipped: true, reason: 'already_settled', auction };
      }

      await client.query(
        `UPDATE auctions SET status = 'finished', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id]
      );

      const hasWinner = auction.winner_id && auction.winner_bid_id;
      const reserve = auction.reserve_price != null ? Number(auction.reserve_price) : null;
      const price = Number(auction.current_price);
      const belowReserve = reserve != null && price < reserve;

      if (!hasWinner || belowReserve) {
        await client.query(
          `UPDATE auctions
           SET settlement_status = 'unsold', updated_at = CURRENT_TIMESTAMP
           WHERE id = $1 AND settlement_status = 'none'`,
          [id]
        );
        const refreshed = await client.query(`SELECT * FROM auctions WHERE id = $1`, [id]);
        return { auction: refreshed.rows?.[0], settlement: 'unsold' };
      }

      if (!auction.acomodacao_id || !auction.stay_check_in || !auction.stay_check_out) {
        await client.query(
          `UPDATE auctions
           SET settlement_status = 'cancelled', updated_at = CURRENT_TIMESTAMP
           WHERE id = $1 AND settlement_status = 'none'`,
          [id]
        );
        return {
          error: 'validation',
          status: 422,
          message: 'Leilão sem acomodacao_id/stay_check_in/stay_check_out — não é possível dar baixa',
        };
      }

      const checkIn =
        typeof auction.stay_check_in === 'string'
          ? auction.stay_check_in.slice(0, 10)
          : new Date(auction.stay_check_in).toISOString().slice(0, 10);
      const checkOut =
        typeof auction.stay_check_out === 'string'
          ? auction.stay_check_out.slice(0, 10)
          : new Date(auction.stay_check_out).toISOString().slice(0, 10);

      const avail = await assertStayAvailable(Number(auction.acomodacao_id), checkIn, checkOut);
      if (!avail.ok) {
        return { error: 'conflict', status: 409, message: avail.message };
      }

      const winner = await resolveWinnerUser(auction.winner_id);
      if (!winner) {
        return {
          error: 'validation',
          status: 422,
          message:
            'Arrematante sem user_id vinculável — defina AUCTION_BOOKING_FALLBACK_USER_ID ou user no customer',
        };
      }

      await holdNights(client, Number(auction.acomodacao_id), avail.nights);

      const due = new Date(Date.now() + paymentDueHours() * 60 * 60 * 1000);
      const code = bookingCode();
      const bookingRows = await client.query(
        `INSERT INTO bookings (
           booking_code, booking_type, item_id, item_name,
           user_id, customer_name, customer_email, customer_phone,
           start_date, end_date, adults_count, guests_count,
           subtotal, total_amount, total, currency,
           payment_method, payment_status, status, notes, metadata
         ) VALUES (
           $1, 'auction', $2, $3,
           $4, $5, $6, $7,
           $8::timestamptz, $9::timestamptz, 1, 1,
           $10, $10, $10, 'BRL',
           'pending', 'pending', 'pending', $11, $12::jsonb
         ) RETURNING id`,
        [
          code,
          Number(auction.acomodacao_id),
          avail.titulo || auction.title,
          winner.userId,
          winner.name,
          winner.email,
          winner.phone,
          `${checkIn}T14:00:00.000Z`,
          `${checkOut}T11:00:00.000Z`,
          price,
          `Arremate leilão #${id}`,
          JSON.stringify({
            source: 'auction',
            auction_id: id,
            winner_bid_id: auction.winner_bid_id,
            stay_check_in: checkIn,
            stay_check_out: checkOut,
          }),
        ]
      );

      const bookingId = bookingRows.rows?.[0]?.id;
      await client.query(
        `UPDATE auctions
         SET booking_id = $1,
             settlement_status = 'pending_payment',
             payment_due_at = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [bookingId, due.toISOString(), id]
      );

      const refreshed = await client.query(`SELECT * FROM auctions WHERE id = $1`, [id]);
      return {
        auction: refreshed.rows?.[0],
        settlement: 'pending_payment',
        bookingId,
        paymentDueAt: due.toISOString(),
        _notify: {
          userId: winner.userId,
          email: winner.email,
          phone: winner.phone,
          name: winner.name,
          amount: price,
          auctionTitle: auction.title,
          auctionId: id,
        },
      };
    });
    if (result?._notify) {
      const n = result._notify;
      try {
        const { notifyAuctionWon, notifyAuctionPaymentDue } = require('../notifications/notification-hooks');
        notifyAuctionWon({
          auction: { id: n.auctionId, title: n.auctionTitle, property_id: result.auction?.property_id },
          userId: n.userId,
          recipient: { email: n.email, phone: n.phone, name: n.name },
          amount: n.amount,
        });
        notifyAuctionPaymentDue({
          auction: { id: n.auctionId, title: n.auctionTitle, property_id: result.auction?.property_id },
          userId: n.userId,
          recipient: { email: n.email, phone: n.phone },
          dueAt: result.paymentDueAt,
        });
      } catch {
        /* optional */
      }
      delete result._notify;
    }
    return result;
  } catch (err) {
    if (err.code === 'HOLD_CONFLICT') {
      return { error: 'conflict', status: 409, message: err.message };
    }
    throw err;
  }
}

async function settleAuctionPayment(auctionId, outcome) {
  const id = parseInt(String(auctionId), 10);
  return withTransaction(async (client) => {
    const locked = await client.query(`SELECT * FROM auctions WHERE id = $1 FOR UPDATE`, [id]);
    const auction = locked.rows?.[0];
    if (!auction) {
      return { error: 'not_found', status: 404, message: 'Leilão não encontrado' };
    }
    if (auction.settlement_status !== 'pending_payment') {
      return { skipped: true, reason: 'not_pending', auction };
    }

    if (outcome === 'paid') {
      if (auction.booking_id) {
        await client.query(
          `UPDATE bookings
           SET status = 'confirmed',
               payment_status = 'paid',
               confirmed_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1 AND status = 'pending'`,
          [auction.booking_id]
        );
      }
      await client.query(
        `UPDATE auctions
         SET settlement_status = 'paid', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id]
      );
      const refreshed = await client.query(`SELECT * FROM auctions WHERE id = $1`, [id]);
      return { auction: refreshed.rows?.[0], settlement: 'paid' };
    }

    if (auction.booking_id) {
      await client.query(
        `UPDATE bookings
         SET status = 'cancelled',
             payment_status = 'failed',
             cancelled_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND status = 'pending'`,
        [auction.booking_id]
      );
    }
    if (auction.acomodacao_id && auction.stay_check_in && auction.stay_check_out) {
      const checkIn =
        typeof auction.stay_check_in === 'string'
          ? auction.stay_check_in.slice(0, 10)
          : new Date(auction.stay_check_in).toISOString().slice(0, 10);
      const checkOut =
        typeof auction.stay_check_out === 'string'
          ? auction.stay_check_out.slice(0, 10)
          : new Date(auction.stay_check_out).toISOString().slice(0, 10);
      const nights = listStayNights(checkIn, checkOut);
      if (nights.length) {
        await client.query(
          `UPDATE disponibilidade_acomodacao
           SET disponivel = true,
               observacao = NULL,
               atualizado_em = CURRENT_TIMESTAMP
           WHERE acomodacao_id = $1
             AND data = ANY($2::date[])
             AND observacao = 'reservado'`,
          [Number(auction.acomodacao_id), nights]
        );
      }
    }
    const status = outcome === 'expired' ? 'expired' : 'cancelled';
    await client.query(
      `UPDATE auctions
       SET settlement_status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [status, id]
    );
    const refreshed = await client.query(`SELECT * FROM auctions WHERE id = $1`, [id]);
    return { auction: refreshed.rows?.[0], settlement: status };
  });
}

async function scanDueAuctionIds(limit = 50) {
  const cap = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 100);
  const rows = await queryDatabase(
    `SELECT id FROM auctions
     WHERE status IN ('scheduled', 'active')
       AND end_date <= CURRENT_TIMESTAMP
       AND settlement_status = 'none'
     ORDER BY end_date ASC
     LIMIT $1
     FOR UPDATE SKIP LOCKED`,
    [cap]
  );
  return (rows || []).map((r) => r.id);
}

async function scanExpiredPaymentAuctionIds(limit = 50) {
  const cap = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 100);
  const rows = await queryDatabase(
    `SELECT id FROM auctions
     WHERE settlement_status = 'pending_payment'
       AND payment_due_at IS NOT NULL
       AND payment_due_at < CURRENT_TIMESTAMP
     ORDER BY payment_due_at ASC
     LIMIT $1
     FOR UPDATE SKIP LOCKED`,
    [cap]
  );
  return (rows || []).map((r) => r.id);
}

module.exports = {
  assertStayAvailable,
  listStayNights,
  finalizeAuction,
  settleAuctionPayment,
  scanDueAuctionIds,
  scanExpiredPaymentAuctionIds,
  paymentDueHours,
  releaseNights,
};
