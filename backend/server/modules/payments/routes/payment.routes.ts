import { Router } from 'express';
import {
  PaymentService,
  PaymentProviderNotConfiguredError,
} from '../services/payment.service';

const router = Router();
const paymentService = new PaymentService();

function paymentErrorStatus(error: unknown): number {
  if (error instanceof PaymentProviderNotConfiguredError) return 503;
  return 500;
}

router.post('/', async (req, res) => {
  try {
    const result = await paymentService.createPayment(req.body.enterpriseId, req.body);
    res.json(result);
  } catch (error) {
    res.status(paymentErrorStatus(error)).json({
      error: (error as Error).message,
      code: error instanceof PaymentProviderNotConfiguredError ? error.code : undefined,
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const filters = req.query;
    const result = await paymentService.listPayments(req.query.enterpriseId as string, filters as any);
    res.json(result);
  } catch (error) {
    res.status(paymentErrorStatus(error)).json({
      error: (error as Error).message,
      code: error instanceof PaymentProviderNotConfiguredError ? error.code : undefined,
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await paymentService.getPayment(req.query.enterpriseId as string, req.params.id);
    if (!result) return res.status(404).json({ error: 'Payment not found' });
    res.json(result);
  } catch (error) {
    res.status(paymentErrorStatus(error)).json({
      error: (error as Error).message,
      code: error instanceof PaymentProviderNotConfiguredError ? error.code : undefined,
    });
  }
});

router.post('/:id/cancel', async (req, res) => {
  try {
    const result = await paymentService.cancelPayment(req.body.enterpriseId, req.params.id);
    res.json(result);
  } catch (error) {
    res.status(paymentErrorStatus(error)).json({
      error: (error as Error).message,
      code: error instanceof PaymentProviderNotConfiguredError ? error.code : undefined,
    });
  }
});


router.get('/booking/:bookingId', async (req, res) => {
  try {
    const result = await paymentService.getPaymentsByBooking(req.params.bookingId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/customer/:customerId', async (req, res) => {
  try {
    const result = await paymentService.getPaymentsByCustomer(req.params.customerId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const result = await paymentService.getPaymentStats(req.query.enterpriseId as string);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/checkout/session', async (req, res) => {
  // Stripe checkout session
  res.json({ message: 'Not implemented' });
});

export default router;