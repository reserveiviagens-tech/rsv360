/**
 * C36-DD — RefundRequest HTTP surface (REQUEST only).
 * No approve / reject / execute endpoints.
 */

import { Router } from 'express';
import {
  createRefundRequest,
  getRefundRequestById,
} from '../services/refund-request.service';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const body = req.body ?? {};
    const result = await createRefundRequest({
      paymentId: String(body.paymentId ?? body.payment_id ?? ''),
      bookingId:
        body.bookingId != null
          ? Number(body.bookingId)
          : body.booking_id != null
            ? Number(body.booking_id)
            : undefined,
      amount: body.amount,
      currency: body.currency,
      reason: body.reason ?? null,
      requestedBy: req.user?.id ?? body.requestedBy ?? null,
      status: body.status === 'draft' ? 'draft' : 'pending',
      idempotencyKey: body.idempotencyKey ?? body.idempotency_key ?? null,
      metadata: body.metadata ?? null,
    });

    if (result.kind === 'rejected') {
      return res.status(400).json({
        success: false,
        error: result.reason,
        detail: result.detail,
      });
    }

    const statusCode = result.kind === 'created' ? 201 : 200;
    return res.status(statusCode).json({
      success: true,
      kind: result.kind,
      data: result.request,
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await getRefundRequestById(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND' });
    }
    return res.json({ success: true, data: row });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
