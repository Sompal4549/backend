import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import * as careerController from '../controllers/career.controller';
import {
  createJob,
  deleteJob,
  exportJobDocument,
  generateJobDescription,
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
  addApplicationNote,
  downloadPrivateFile,
  exportApplicationsCsv,
  getApplicationById,
  getFileSignedUrl,
  listApplications,
  listApplicationsBoard,
  resendApplicationEmails,
  submitApplication,
  updateApplicationHr,
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
import {
  createCareerOption,
  deleteCareerOption,
  getAdminCareerOptions,
  getPublicCareerOptions,
  updateCareerOption,
} from '../controllers/career-option.controller';
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

// Public application-form choices (Notice / Joining Period, Expected CTC)
router.get('/options', getPublicCareerOptions);

// Private Candidate Uploads (Contract §4.1)
router.post('/uploads', upload.single('file'), uploadPrivateFile);

// Candidate AI Profile Photo Verification
router.post(
  '/verify-photo',
  upload.single('photo'),
  async (req, res, next) => {
    try {
      const { verifyCandidateProfilePhoto } = await import('../services/ai-profile-photo.service');
      const file = req.file;
      let buffer: Buffer | null = file ? file.buffer : null;
      let mimeType = file?.mimetype || 'image/jpeg';

      if (!buffer && req.body?.imageBase64) {
        const raw = req.body.imageBase64;
        const match = raw.match(/^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
        if (match) {
          mimeType = match[1];
          buffer = Buffer.from(match[2], 'base64');
        } else {
          buffer = Buffer.from(raw, 'base64');
        }
      }

      if (!buffer) {
        res.status(400).json({ success: false, approved: false, reason: 'Please upload an image file in "photo" field.' });
        return;
      }

      const result = await verifyCandidateProfilePhoto(buffer, mimeType, {
        candidateGender: req.body?.candidateGender || req.body?.gender,
        candidateAge: req.body?.candidateAge || req.body?.age,
        candidateDob: req.body?.candidateDob || req.body?.dateOfBirth,
        candidateName: req.body?.candidateName || req.body?.name,
      });

      res.json({
        success: result.approved,
        ok: result.approved,
        approved: result.approved,
        photoUrl: result.photoUrl,
        confidence: result.confidence,
        detected: result.detected,
        checks: result.checks,
        rejection_reasons: result.rejection_reasons,
        reason: result.rejection_reasons[0] || (result.approved ? '' : result.feedback),
        feedback: result.feedback,
      });
    } catch (err) {
      next(err);
    }
  }
);

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
router.post('/admin/jobs/generate-description', authMiddleware, adminMiddleware, generateJobDescription);
router.post('/admin/jobs', authMiddleware, adminMiddleware, createJob);
router.get('/admin/jobs/:id/export', authMiddleware, adminMiddleware, exportJobDocument);
router.get('/admin/jobs/:id', authMiddleware, adminMiddleware, getJob);
router.patch('/admin/jobs/:id', authMiddleware, adminMiddleware, updateJob);
router.delete('/admin/jobs/:id', authMiddleware, adminMiddleware, deleteJob);

// Admin Applications
router.get('/admin/applications/export.csv', authMiddleware, adminMiddleware, exportApplicationsCsv);
router.get('/admin/applications', authMiddleware, adminMiddleware, listApplications);
// Flat board rows for the admin "Applications & AI Response" screen (NOT the paginated list)
router.get('/admin/applications-board', authMiddleware, adminMiddleware, listApplicationsBoard);
router.get('/admin/applications/:id', authMiddleware, adminMiddleware, getApplicationById);
router.patch('/admin/applications/:id/status', authMiddleware, adminMiddleware, updateApplicationStatus);
// HR workflow on the Applications & AI Response board
router.patch('/admin/applications/:id/hr', authMiddleware, adminMiddleware, updateApplicationHr);
router.post('/admin/applications/:id/notes', authMiddleware, adminMiddleware, addApplicationNote);
router.post('/admin/applications/:id/resend-email', authMiddleware, adminMiddleware, resendApplicationEmails);

// Admin Files & Signed URLs
router.get('/admin/files/:fileId/signed-url', authMiddleware, adminMiddleware, getFileSignedUrl);
router.get('/admin/files/:fileId/download', downloadPrivateFile);

// Admin Career Settings
router.get('/admin/settings', authMiddleware, adminMiddleware, getAdminSettings);
router.put('/admin/settings', authMiddleware, adminMiddleware, updateAdminSettings);

// Admin application-form choices (Add by Admin → Dropdowns)
router.get('/admin/options', authMiddleware, adminMiddleware, getAdminCareerOptions);
router.post('/admin/options', authMiddleware, adminMiddleware, createCareerOption);
router.patch('/admin/options/:id', authMiddleware, adminMiddleware, updateCareerOption);
router.delete('/admin/options/:id', authMiddleware, adminMiddleware, deleteCareerOption);

// Backward compatibility for result messages tab
router.get('/admin/result-messages', authMiddleware, adminMiddleware, getResultMessages);
router.put('/admin/result-messages', authMiddleware, adminMiddleware, updateResultMessages);

// ==========================================
// 3. PUBLIC JOB BY SLUG (Mounted last to catch /:slug)
// ==========================================
router.get('/:slug', careerController.getCareerBySlug);

export { router as careerRouter };