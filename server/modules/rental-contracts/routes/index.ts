import { Router, type Request } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateJwt, requireRole } from '../../../middleware/auth.middleware';
import {
  rentalContractPreviewSchema,
  rentalPublicCompleteSchema,
  rentalSignRequestSchema,
} from '../schema';
import {
  buildPublicSignPath,
  buildRentalContractPdf,
  completeSignRequest,
  createSignRequest,
  getContractPdfForToken,
  getPublicSignView,
  listSignRequestsByUnit,
  revokeSignRequest,
} from '../services/rental-contract.service';
import { sendRentalSignInviteEmail } from '../services/rental-sign-email.service';

const router = Router();

const parceiroAuth = [
  authenticateJwt,
  requireRole('anfitriao', 'corretor', 'agente', 'promotor', 'admin', 'manager'),
];

const publicSignLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Muitas tentativas. Tente novamente em instantes.' },
});

function tokenFromQuery(req: Request): string {
  return String(req.query.token ?? '').trim();
}

router.get('/health', (_req, res) => {
  res.json({ module: 'rental-contracts', status: 'ok' });
});

router.post('/sign/:requestId/revoke', ...parceiroAuth, async (req, res) => {
  const requestId = String(req.params.requestId ?? '').trim();
  const unitId = String(req.query.unitId ?? '').trim();
  if (!requestId || !unitId) {
    return res.status(400).json({ success: false, error: 'requestId e unitId obrigatórios' });
  }
  try {
    const result = await revokeSignRequest(requestId, unitId);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Solicitação inválida ou não revogável' });
    }
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/sign-requests', ...parceiroAuth, async (req, res) => {
  const unitId = String(req.query.unitId ?? '').trim();
  if (!unitId) {
    return res.status(400).json({ success: false, error: 'unitId obrigatório' });
  }
  try {
    const items = await listSignRequestsByUnit(unitId);
    return res.json({ success: true, data: { items } });
  } catch (error) {
    return res.status(500).json({ success: false, error: (error as Error).message });
  }
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
    const signingToken = created.signingToken ?? '';
    const emailInvite = await sendRentalSignInviteEmail({
      destinatarioEmail: parsed.data.signerEmail,
      signerName: parsed.data.signerName,
      unitName: parsed.data.unitName,
      requestId: created.id,
      signingToken,
      expiresAtIso: created.expiresAt,
    });
    return res.status(201).json({
      success: true,
      data: {
        requestId: created.id,
        unitId: created.unitId,
        status: created.status,
        expiresAt: created.expiresAt,
        signingToken,
        publicSignUrl: buildPublicSignPath(created.id, signingToken),
        emailInvite: {
          sent: emailInvite.ok,
          skipped: emailInvite.skipped ?? false,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/public/sign/:requestId', publicSignLimiter, async (req, res) => {
  const requestId = String(req.params.requestId ?? '').trim();
  const token = tokenFromQuery(req);
  if (!requestId || !token) {
    return res.status(400).json({ success: false, error: 'requestId e token obrigatórios' });
  }
  const view = await getPublicSignView(requestId, token);
  if (!view) {
    return res.status(404).json({ success: false, error: 'Link inválido ou expirado' });
  }
  return res.json({ success: true, data: view });
});

router.get('/public/sign/:requestId/pdf', publicSignLimiter, async (req, res) => {
  const requestId = String(req.params.requestId ?? '').trim();
  const token = tokenFromQuery(req);
  if (!requestId || !token) {
    return res.status(400).json({ success: false, error: 'requestId e token obrigatórios' });
  }
  const pdf = await getContractPdfForToken(requestId, token);
  if (!pdf) {
    return res.status(404).json({ success: false, error: 'Documento indisponível' });
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="contrato-${requestId}.pdf"`);
  return res.status(200).send(pdf);
});

router.post('/public/sign/:requestId/complete', publicSignLimiter, async (req, res) => {
  const requestId = String(req.params.requestId ?? '').trim();
  const parsed = rentalPublicCompleteSchema.safeParse(req.body ?? {});
  if (!requestId || !parsed.success) {
    return res.status(400).json({ success: false, error: 'Dados inválidos' });
  }

  const result = await completeSignRequest(requestId, parsed.data.token);
  if (!result) {
    return res.status(404).json({ success: false, error: 'Solicitação inválida' });
  }
  return res.json({ success: true, data: result });
});

/** Compat: staff com JWT pode concluir com token (ex.: suporte). */
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