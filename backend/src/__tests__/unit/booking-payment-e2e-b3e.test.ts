/**
 * Aruanda B3e — booking → payment → inventory → portal status (test doubles, no PII).
 * Documents the paid-booking contract without calling live providers.
 */
import { PaymentService } from '../../../server/modules/payments/services/payment.service';
import type {
  CreatePaymentDTO,
  PaymentFilters,
  PaymentProviderInterface,
  PaymentResult,
  PaginatedResult,
  CreateRefundDTO,
  RefundResult,
} from '../../../server/modules/payments/interfaces';

type Offer = {
  id: string;
  acomodacaoId: string;
  checkIn: string;
  checkOut: string;
  amount: number;
  currency: string;
};

type InventorySlot = {
  acomodacaoId: string;
  date: string;
  estado: 'livre' | 'reservado';
};

type PortalBooking = {
  id: string;
  offerId: string;
  paymentId: string | null;
  paymentStatus: string | null;
  status: 'draft' | 'pending' | 'confirmed';
};

function makeProvider(createImpl?: PaymentProviderInterface['createPayment']): PaymentProviderInterface {
  return {
    name: 'double',
    createPayment:
      createImpl ||
      (async (data: CreatePaymentDTO): Promise<PaymentResult> => ({
        id: 'pay_e2e_1',
        externalId: 'ext_e2e_1',
        status: 'approved',
        amount: data.amount,
        currency: data.currency,
        metadata: data.metadata || {},
      })),
    getPayment: async (id: string) => ({
      id,
      externalId: id,
      status: 'approved',
      amount: 200,
      currency: 'BRL',
      metadata: {},
    }),
    cancelPayment: async (id: string) => ({
      id,
      externalId: id,
      status: 'cancelled',
      amount: 200,
      currency: 'BRL',
      metadata: {},
    }),
    createRefund: async (_d: CreateRefundDTO): Promise<RefundResult> => {
      throw new Error('unused');
    },
    listPayments: async (_f: PaymentFilters): Promise<PaginatedResult<PaymentResult>> => ({
      data: [],
      total: 0,
      limit: 10,
      offset: 0,
    }),
    createCheckoutSession: async () => ({
      sessionId: 'sess_e2e_1',
      url: 'https://checkout.example/e2e',
      provider: 'double',
    }),
    createProviderCustomer: async (data) => ({
      externalId: `ext_${data.email}`,
    }),
    verifyWebhookSignature: () => true,
  };
}

function nightsBetween(checkIn: string, checkOut: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${checkIn}T12:00:00Z`);
  const end = new Date(`${checkOut}T12:00:00Z`);
  while (cur < end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

describe('booking payment E2E contract (Aruanda B3e)', () => {
  const prevProvider = process.env.PAYMENT_PROVIDER;
  const prevMp = process.env.MP_ACCESS_TOKEN;

  beforeEach(() => {
    process.env.PAYMENT_PROVIDER = 'mercadopago';
    process.env.MP_ACCESS_TOKEN = 'TEST_TOKEN';
  });

  afterEach(() => {
    process.env.PAYMENT_PROVIDER = prevProvider;
    process.env.MP_ACCESS_TOKEN = prevMp;
  });

  it('oferta → pagamento (double) → inventário reservado → portal confirmed', async () => {
    const offer: Offer = {
      id: 'offer_1',
      acomodacaoId: 'unit_9',
      checkIn: '2026-10-01',
      checkOut: '2026-10-03',
      amount: 400,
      currency: 'BRL',
    };

    const inventory: InventorySlot[] = nightsBetween(offer.checkIn, offer.checkOut).map((date) => ({
      acomodacaoId: offer.acomodacaoId,
      date,
      estado: 'livre',
    }));

    const portal: PortalBooking = {
      id: 'booking_1',
      offerId: offer.id,
      paymentId: null,
      paymentStatus: null,
      status: 'pending',
    };

    const payments = new PaymentService(makeProvider());
    const payment = await payments.createPayment('ent_e2e', {
      amount: offer.amount,
      currency: offer.currency,
      customerId: 'cus_e2e',
      paymentMethod: 'pix',
      metadata: { offerId: offer.id, bookingId: portal.id },
    });

    expect(payment.id).toBe('pay_e2e_1');
    expect(payment.status).toBe('approved');
    expect(String(payment.id)).not.toContain('pay_mock_');

    if (payment.status === 'approved') {
      for (const slot of inventory) {
        slot.estado = 'reservado';
      }
      portal.paymentId = payment.id;
      portal.paymentStatus = payment.status;
      portal.status = 'confirmed';
    }

    expect(inventory.every((s) => s.estado === 'reservado')).toBe(true);
    expect(portal.status).toBe('confirmed');
    expect(portal.paymentId).toBe('pay_e2e_1');
    expect(portal.paymentStatus).toBe('approved');
  });

  it('pagamento rejeitado não reserva inventário', async () => {
    const inventory: InventorySlot[] = [
      { acomodacaoId: 'unit_1', date: '2026-11-01', estado: 'livre' },
    ];
    const payments = new PaymentService(
      makeProvider(async (data) => ({
        id: 'pay_fail_1',
        externalId: 'ext_fail',
        status: 'rejected',
        amount: data.amount,
        currency: data.currency,
        metadata: {},
      })),
    );

    const payment = await payments.createPayment('ent_e2e', {
      amount: 100,
      currency: 'BRL',
      customerId: 'cus_e2e',
      paymentMethod: 'credit_card',
    });

    expect(payment.status).toBe('rejected');
    expect(inventory[0].estado).toBe('livre');
  });
});
