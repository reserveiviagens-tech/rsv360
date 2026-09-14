import { Router } from 'express';
import { requireRole } from '../middleware/hk-auth.middleware';
import { schedulerService } from '../services/scheduler.service';

const router = Router();

const staffAuth = requireRole('admin', 'manager', 'staff', 'housekeeper');

/** Readiness / honesty probe for auto-schedule (Aruanda B5). */
router.get('/status', staffAuth, async (_req, res) => {
  try {
    const data = await schedulerService.getStatus();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * Probe / dry-run of daily schedule — does not invent tasks while not_implemented.
 * Returns explicit mode + reason (never silent zero-success).
 */
router.post('/run', staffAuth, async (_req, res) => {
  try {
    const data = await schedulerService.runDailySchedule();
    const status = data.mode === 'not_implemented' ? 501 : 200;
    res.status(status).json({
      success: data.mode !== 'not_implemented',
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
module.exports = router;
