import { Router } from 'express';
import { authenticateJwt, requireRole } from '../../../middleware/auth.middleware';
import { requirePortalAdminManager } from '../../membership/guest-portal-admin.guard';
import { tokenService } from '../services/token.service';
import { requestsService } from '../services/requests.service';
import { feedbackService } from '../services/feedback.service';

const router = Router();

/** Fail-closed: real JWT + staff role (replaces cloud stub Bearer-any → admin). */
router.use(authenticateJwt);
router.use(requireRole('admin', 'manager'));
// WS-15 G-B.2: camada canonica COMPLEMENTAR atras da flag WS15_MEMBERSHIP_AUTHORITY.
// Flag OFF => no-op (legacy governa); flag ON => exige membership verificada + role >= manager.
router.use(requirePortalAdminManager);

router.post('/tokens', async (req, res) => {
  try {
    const result = await tokenService.generateToken(req.body.bookingId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.delete('/tokens/:bookingId', async (req, res) => {
  try {
    const result = await tokenService.revokeToken(req.params.bookingId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/requests', async (_req, res) => {
  try {
    const result = await requestsService.listAllRequests();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.put('/requests/:id', async (req, res) => {
  try {
    const result = await requestsService.updateRequestStatus(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/feedback', async (req, res) => {
  try {
    const result = await feedbackService.listFeedback(req.query as Record<string, any>);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.put('/feedback/:id/publish', async (req, res) => {
  try {
    const result = await feedbackService.publishFeedback(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.put('/feedback/:id/unpublish', async (req, res) => {
  try {
    const result = await feedbackService.unpublishFeedback(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/feedback/stats', async (_req, res) => {
  try {
    const result = await feedbackService.getFeedbackStats();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;

module.exports = router;

