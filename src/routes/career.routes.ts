import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import * as careerController from '../controllers/career.controller';
import {
  createJob,
  deleteJob,
  getJob,
  listJobs,
  updateJob,
} from '../controllers/careers-admin.controller';
import {
  getScreening,
  getScreeningReport,
  startScreening,
} from '../controllers/career-screening.controller';
import {
  downloadPrivateFile,
  exportApplicationsCsv,
  getApplicationById,
  getFileSignedUrl,
  listApplications,
  resendApplicationEmails,
  submitApplication,
  updateApplicationStatus,
  uploadPrivateFile,
} from '../controllers/career-application.controller';
import {
  getAdminSettings,
  getPublicSettings,
  getResultMessages,
  updateAdminSettings,
  updateResultMessages,
} from '../controllers/career-settings.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB max memory buffer
});

// Rate limiter for CV screening starts: 5 per hour per IP (per Contract §3.1)
const screeningLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many screening requests from this IP. Please try again after an hour.',
  },
  skip: (req) => {
    const ip = req.ip || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  },
});

// ==========================================
// 1. PUBLIC ROUTES (Specific subpaths first)
// ==========================================

// Public Job List (Contract §1)
router.get('/', careerController.getCareers);

// Public Settings & Contact details
router.get('/settings', getPublicSettings);

// Private Candidate Uploads (Contract §4.1)
router.post('/uploads', upload.single('file'), uploadPrivateFile);

// Candidate Applications (Contract §4)
router.post('/applications', submitApplication);

// AI Screenings (Contract §3)
router.get('/screenings/:screeningId/report.pdf', getScreeningReport);
router.get('/screenings/:screeningId', getScreening);
router.post('/:jobId/screenings', screeningLimiter, upload.single('cv'), startScreening);

// ==========================================
// 2. ADMIN ROUTES
// ==========================================

// Admin Jobs
router.get('/admin/jobs', authMiddleware, adminMiddleware, listJobs);
router.post('/admin/jobs', authMiddleware, adminMiddleware, createJob);
router.get('/admin/jobs/:id', authMiddleware, adminMiddleware, getJob);
router.patch('/admin/jobs/:id', authMiddleware, adminMiddleware, updateJob);
router.delete('/admin/jobs/:id', authMiddleware, adminMiddleware, deleteJob);

// Admin Applications
router.get('/admin/applications/export.csv', authMiddleware, adminMiddleware, exportApplicationsCsv);
router.get('/admin/applications', authMiddleware, adminMiddleware, listApplications);
router.get('/admin/applications-board', authMiddleware, adminMiddleware, listApplications);
router.get('/admin/applications/:id', authMiddleware, adminMiddleware, getApplicationById);
router.patch('/admin/applications/:id/status', authMiddleware, adminMiddleware, updateApplicationStatus);
router.post('/admin/applications/:id/resend-email', authMiddleware, adminMiddleware, resendApplicationEmails);

// Admin Files & Signed URLs
router.get('/admin/files/:fileId/signed-url', authMiddleware, adminMiddleware, getFileSignedUrl);
router.get('/admin/files/:fileId/download', downloadPrivateFile);

// Admin Career Settings
router.get('/admin/settings', authMiddleware, adminMiddleware, getAdminSettings);
router.put('/admin/settings', authMiddleware, adminMiddleware, updateAdminSettings);

// Backward compatibility for result messages tab
router.get('/admin/result-messages', authMiddleware, adminMiddleware, getResultMessages);
router.put('/admin/result-messages', authMiddleware, adminMiddleware, updateResultMessages);

// ==========================================
// 3. PUBLIC JOB BY SLUG (Mounted last to catch /:slug)
// ==========================================
router.get('/:slug', careerController.getCareerBySlug);

export { router as careerRouter };