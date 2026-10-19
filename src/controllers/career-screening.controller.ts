import { Request, Response } from 'express';
import crypto from 'crypto';
import path from 'path';
import { asyncHandler } from '../utils/async-handler';
import { successResponse } from '../utils/api-response';
import { AppError } from '../utils/app-error';
import { CareerModel } from '../models/career.model';
import { ScreeningModel, StepKey } from '../models/screening.model';
import { processScreeningAsync } from '../services/ai-cv.service';
import { generateScreeningReportPdf } from '../services/screening-report.service';
import { savePrivateFile } from '../services/private-upload.service';

const ALLOWED_CV_EXTS = ['.pdf', '.doc', '.docx'];
const MAX_CV_BYTES = 5 * 1024 * 1024; // 5 MB

export const startScreening = asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const file = req.file;

  if (!file) {
    throw new AppError(422, 'CV file is required in "cv" field');
  }

  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_CV_EXTS.includes(ext)) {
    throw new AppError(422, 'Invalid file type. Only PDF, DOC and DOCX files are allowed.');
  }

  if (file.size > MAX_CV_BYTES) {
    throw new AppError(422, 'File size exceeds maximum limit of 5 MB');
  }

  // Verify Job
  const job = await CareerModel.findById(jobId).lean().catch(() => null);
  if (!job) {
    throw new AppError(404, 'Job not found');
  }

  const isOpen = job.status === 'active' || job.jobStatus === 'OPEN';
  if (!isOpen) {
    throw new AppError(410, 'This job opening is closed and no longer accepting applications');
  }

  // Save CV file privately
  const privateFile = await savePrivateFile(file.buffer, file.originalname, 'cv', req.ip);

  const screeningId = crypto.randomUUID();
  const uploadedAt = new Date().toISOString();

  const stepKeys: StepKey[] = [
    'read_cv',
    'match_skills',
    'check_experience',
    'verify_education',
    'analyze_competencies',
    'calculate_score',
  ];
  const stepLabels: Record<StepKey, string> = {
    read_cv: 'Reading CV document & extracting details',
    match_skills: 'Matching core skills & requirements',
    check_experience: 'Evaluating experience & projects',
    verify_education: 'Verifying educational background',
    analyze_competencies: 'Analyzing domain competencies',
    calculate_score: 'Calculating overall eligibility score',
  };

  const initialSteps = stepKeys.map((key) => ({
    key,
    label: stepLabels[key],
    state: (key === 'read_cv' ? 'active' : 'pending') as 'active' | 'pending',
  }));

  const screening = await ScreeningModel.create({
    screeningId,
    jobId: String(job._id),
    status: 'processing',
    progress: 5,
    steps: initialSteps,
    cv: {
      fileName: file.originalname,
      size: file.size,
      uploadedAt,
      fileId: privateFile.fileId,
      storagePath: privateFile.storagePath,
    },
    ip: req.ip,
  });

  // Start processing in the background
  setImmediate(() => {
    processScreeningAsync(screeningId, String(job._id), file.buffer, file.originalname).catch(
      (err) => {
        console.error('[Screening] Background processing unhandled error:', err);
      }
    );
  });

  successResponse(
    res,
    {
      screeningId: screening.screeningId,
      status: 'processing',
      cv: {
        fileName: file.originalname,
        size: file.size,
        uploadedAt,
      },
    },
    'CV screening started',
    201
  );
});

export const getScreening = asyncHandler(async (req: Request, res: Response) => {
  const { screeningId } = req.params;
  const screening = await ScreeningModel.findOne({ screeningId }).lean();

  if (!screening) {
    throw new AppError(404, 'Screening record not found');
  }

  const job = await CareerModel.findById(screening.jobId).lean().catch(() => null);

  let sanitizedResult: any = undefined;
  if (screening.result) {
    sanitizedResult = { ...screening.result };

    // Respect showMatchScoreToCandidate
    if (job && job.showMatchScoreToCandidate === false) {
      delete sanitizedResult.score;
    }

    // Respect showMatchBreakdown
    if (job && job.showMatchBreakdown === false) {
      delete sanitizedResult.breakdown;
    }
  }

  successResponse(
    res,
    {
      screeningId: screening.screeningId,
      jobId: screening.jobId,
      status: screening.status,
      progress: screening.progress,
      steps: screening.steps,
      cv: {
        fileName: screening.cv.fileName,
        size: screening.cv.size,
        uploadedAt: screening.cv.uploadedAt,
      },
      error: screening.error,
      result: sanitizedResult,
    },
    'Screening status retrieved'
  );
});

export const getScreeningReport = asyncHandler(async (req: Request, res: Response) => {
  const { screeningId } = req.params;
  const screening = await ScreeningModel.findOne({ screeningId });

  if (!screening) {
    throw new AppError(404, 'Screening record not found');
  }

  if (screening.status !== 'done' || !screening.result) {
    throw new AppError(400, 'Screening analysis is not completed yet');
  }

  const job = await CareerModel.findById(screening.jobId);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="Ensis-Screening-Report-${screeningId}.pdf"`
  );

  const pdfStream = generateScreeningReportPdf(screening, job);
  pdfStream.pipe(res);
});
