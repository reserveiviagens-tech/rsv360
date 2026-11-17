import { Router, type Request } from 'express';
import { authenticateJwt, requireRole } from '../../../middleware/auth.middleware';
import {
  rentalContractPreviewSchema,
  rentalSignRequestSchema,
} from '../schema';
import {
  buildRentalContractPdf,
  completeSignRequest,
  createSignRequest,
} from '../services/rental-contract.service';

const router = Router();

const parceiroAuth = [
  authenticateJwt,
  requireRole('anfitriao', 'corretor', 'agente', 'promotor', 'admin', 'manager'),
];

router.get('/health', (_req, res) => {
  res.json({ module: 'rental-contracts', status: 'ok' });
});

router.post('/preview', ...parceiroAuth, (req, res) => {
  const parsed = rentalContractPreviewSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Payload inválido',
      details: parsed.error.flatten(),
    });
  }

  const pdf = buildRentalContractPdf(parsed.data);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="contrato-${parsed.data.unitId}.pdf"`,
  );
  return res.status(200).send(pdf);
});

router.post('/sign-request', ...parceiroAuth, async (req, res) => {
  const parsed = rentalSignRequestSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Payload inválido',
      details: parsed.error.flatten(),
    });
  }

  try {
    const created = await createSignRequest(parsed.data);
    return res.status(201).json({
    success: true,
    data: {
      requestId: created.id,
      unitId: created.unitId,
      status: created.status,
      expiresAt: created.expiresAt,
      signingToken: created.signingToken,
      signUrl: `/api/v1/rental-contracts/sign/${created.id}`,
    },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/sign/:requestId/complete', ...parceiroAuth, async (req: Request, res) => {
  const requestId = String(req.params.requestId ?? '').trim();
  const token = String((req.body as { token?: string })?.token ?? '').trim();
  if (!requestId || !token) {
    return res.status(400).json({ success: false, error: 'requestId e token obrigatórios' });
  }

  const result = await completeSignRequest(requestId, token);
  if (!result) {
    return res.status(404).json({ success: false, error: 'Solicitação inválida' });
  }

  return res.json({ success: true, data: result });
});

export default router;