import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { successResponse } from '../utils/api-response';

const router = Router();

// The admin Topbar counts SLA breaches in its notification badge. Ensis has no case/SLA
// workflow (that came from the Organic Expo admin), so there is never a breach to report.
router.get('/admin/sla-breaches', authMiddleware, adminMiddleware, (_req, res) => {
  successResponse(res, [], 'No SLA breaches');
});

export { router as casesRouter };
