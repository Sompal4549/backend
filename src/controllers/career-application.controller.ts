import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { asyncHandler } from '../utils/async-handler';
import { successResponse } from '../utils/api-response';
import { AppError } from '../utils/app-error';
import { CareerModel } from '../models/career.model';
import { ScreeningModel } from '../models/screening.model';
import {
  ApplicationStatus,
  CareerApplicationModel,
} from '../models/career-application.model';
import { getNextApplicationId } from '../models/career-counter.model';
import {
  generateSignedUrl,
  getPrivateFile,
  savePrivateFile,
  verifySignedUrlSignature,
} from '../services/private-upload.service';
import {
  sendCandidateConfirmationEmail,
  sendCandidateStatusUpdateEmail,
  sendHrNotificationEmail,
} from '../services/career-email.service';
import { escapeRegex } from '../utils/escape-regex';

const PHOTO_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
const DOC_EXTS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_DOC_BYTES = 10 * 1024 * 1024; // 10 MB

// POST /careers/uploads
export const uploadPrivateFile = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    throw new AppError(422, 'Upload file is required in "file" field');
  }

  const ext = path.extname(file.originalname).toLowerCase();
  const isPhoto = PHOTO_EXTS.includes(ext);
  const isDoc = DOC_EXTS.includes(ext);

  if (!isPhoto && !isDoc) {
    throw new AppError(422, 'Invalid file type. Allowed: JPG, PNG, WEBP, PDF, DOC, DOCX');
  }

  const kind = isPhoto && file.size <= MAX_PHOTO_BYTES ? 'photo' : 'document';
  const maxSize = kind === 'photo' ? MAX_PHOTO_BYTES : MAX_DOC_BYTES;

  if (file.size > maxSize) {
    throw new AppError(
      422,
      `File size exceeds maximum limit of ${kind === 'photo' ? '2 MB' : '10 MB'}`
    );
  }

  const saved = await savePrivateFile(file.buffer, file.originalname, kind, req.ip);

  successResponse(
    res,
    {
      fileId: saved.fileId,
      fileName: saved.fileName,
      size: saved.size,
      kind: saved.kind,
    },
    'File uploaded successfully',
    201
  );
});

// POST /careers/applications
export const submitApplication = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body || {};
  const errors: Array<{ field: string; message: string }> = [];

  // Validation
  if (!body.screeningId || typeof body.screeningId !== 'string') {
    errors.push({ field: 'screeningId', message: 'Valid screeningId is required' });
  }
  if (!body.jobId || typeof body.jobId !== 'string') {
    errors.push({ field: 'jobId', message: 'Valid jobId is required' });
  }

  const profile = body.profile || {};
  if (!String(profile.fullName || '').trim()) {
    errors.push({ field: 'profile.fullName', message: 'Full name is required' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!profile.email || !emailRegex.test(String(profile.email).trim())) {
    errors.push({ field: 'profile.email', message: 'Valid email address is required' });
  }
  if (!String(profile.phone || '').trim()) {
    errors.push({ field: 'profile.phone', message: 'Phone number is required' });
  }

  const details = body.details || {};
  if (!Array.isArray(details.preferredLocations) || details.preferredLocations.length === 0) {
    errors.push({ field: 'details.preferredLocations', message: 'At least one preferred location is required' });
  }
  if (!String(details.noticePeriod || '').trim()) {
    errors.push({ field: 'details.noticePeriod', message: 'Notice period is required' });
  }
  if (!String(details.expectedCtc || '').trim()) {
    errors.push({ field: 'details.expectedCtc', message: 'Expected CTC is required' });
  }
  if (!String(details.joiningPreference || '').trim()) {
    errors.push({ field: 'details.joiningPreference', message: 'Joining preference is required' });
  }

  const additional = body.additional || {};
  if (!String(additional.whyJoin || '').trim()) {
    errors.push({ field: 'additional.whyJoin', message: 'Please share why you would like to join Ensis' });
  }

  const consents = body.consents || {};
  if (consents.accurate !== true || consents.verify !== true || consents.privacy !== true) {
    errors.push({ field: 'consents', message: 'All mandatory consents must be confirmed' });
  }

  if (errors.length > 0) {
    res.status(422).json({
      success: false,
      statusCode: 422,
      message: 'Validation failed',
      data: { errors },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Verify Job
  const job = await CareerModel.findById(body.jobId).catch(() => null);
  if (!job) {
    throw new AppError(404, 'Job not found');
  }

  const isOpen = job.status === 'active' || job.jobStatus === 'OPEN';
  if (!isOpen) {
    throw new AppError(410, 'This job opening is closed and no longer accepting applications');
  }

  // Verify Screening
  const screening = await ScreeningModel.findOne({
    screeningId: body.screeningId,
    jobId: String(job._id),
  });

  if (!screening) {
    throw new AppError(404, 'Associated screening record not found for this role');
  }

  if (screening.status !== 'done' || !screening.result) {
    throw new AppError(400, 'CV screening analysis is not completed yet');
  }

  // Reject not_eligible applications (Contract §4)
  if (screening.result.level === 'not_eligible') {
    throw new AppError(
      409,
      'Candidate profile does not meet eligibility threshold for this role'
    );
  }

  // Check duplicate application within 30 days
  const candidateEmail = String(profile.email).toLowerCase().trim();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const existingApp = await CareerApplicationModel.findOne({
    jobId: String(job._id),
    $or: [{ email: candidateEmail }, { 'profile.email': candidateEmail }],
    createdAt: { $gte: thirtyDaysAgo },
  });

  if (existingApp) {
    throw new AppError(
      409,
      'An application for this role with this email was already submitted in the last 30 days'
    );
  }

  // Atomic sequence application ID
  const applicationId = await getNextApplicationId();

  // Create Application document
  const application = await CareerApplicationModel.create({
    applicationId,
    screeningId: screening.screeningId,
    jobId: String(job._id),
    jobTitle: job.title,
    profile: {
      fullName: String(profile.fullName).trim(),
      email: candidateEmail,
      phone: String(profile.phone).trim(),
      dateOfBirth: profile.dateOfBirth,
      gender: profile.gender,
      currentLocation: profile.currentLocation,
      permanentAddress: profile.permanentAddress,
      linkedin: profile.linkedin,
      photoUrl: profile.photoUrl,
      education: Array.isArray(profile.education) ? profile.education : screening.result.profile.education,
      experience: Array.isArray(profile.experience) ? profile.experience : screening.result.profile.experience,
      skills: Array.isArray(profile.skills) ? profile.skills : screening.result.profile.skills,
      certifications: Array.isArray(profile.certifications) ? profile.certifications : screening.result.profile.certifications,
    },
    details: {
      preferredLocations: details.preferredLocations,
      noticePeriod: String(details.noticePeriod).trim(),
      expectedCtc: String(details.expectedCtc).trim(),
      joiningPreference: String(details.joiningPreference).trim(),
      howDidYouHear: details.howDidYouHear,
      willingToRelocate: Boolean(details.willingToRelocate),
    },
    additional: {
      whyJoin: String(additional.whyJoin).trim(),
      extraSkills: additional.extraSkills,
      workedWith: Array.isArray(additional.workedWith) ? additional.workedWith : [],
    },
    references: Array.isArray(body.references) ? body.references.slice(0, 2) : [],
    documents: Array.isArray(body.documents) ? body.documents : [],
    consents: {
      accurate: true,
      verify: true,
      futureContact: Boolean(consents.futureContact),
      privacy: true,
    },
    screeningResult: screening.result,
    status: 'received',
    statusHistory: [
      {
        status: 'received',
        changedAt: new Date(),
        note: 'Application submitted online by candidate',
      },
    ],
    // Mirror legacy fields
    fullName: String(profile.fullName).trim(),
    email: candidateEmail,
    phone: String(profile.phone).trim(),
    currentLocation: profile.currentLocation || job.location,
    department: job.department || 'Ayurveda & Wellness',
    resume: screening.cv.fileName,
    experience: job.experience || '2 - 5 Years',
    source: 'ai-cv',
    aiScore: screening.result.score,
    aiSummary: (screening.result.strengths || []).slice(0, 3).join('. '),
    linkedin: profile.linkedin,
    noticePeriod: details.noticePeriod,
    expectedCTC: details.expectedCtc,
    willingToRelocate: details.willingToRelocate ? 'Yes' : 'No',
  });

  // Increment application count on the job
  await CareerModel.findByIdAndUpdate(job._id, { $inc: { applications: 1 } });

  // Send candidate and HR emails asynchronously
  setImmediate(() => {
    Promise.all([
      sendCandidateConfirmationEmail(application, job),
      sendHrNotificationEmail(application, job),
    ]).catch((err) => {
      console.error('[Career Application] Email notification warning:', err);
    });
  });

  successResponse(
    res,
    {
      applicationId: application.applicationId,
      submittedAt: application.createdAt.toISOString(),
      jobTitle: job.title,
      email: application.profile.email,
      matchScore: application.screeningResult?.score,
      status: 'received',
    },
    'Application submitted successfully',
    201
  );
});

// GET /careers/admin/applications
export const listApplications = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const filter: Record<string, any> = {};

  if (req.query.jobId) {
    filter.jobId = String(req.query.jobId);
  }

  if (req.query.status) {
    filter.status = String(req.query.status);
  }

  if (req.query.level) {
    filter['screeningResult.level'] = String(req.query.level);
  }

  if (req.query.search) {
    const s = escapeRegex(String(req.query.search).trim());
    filter.$or = [
      { applicationId: { $regex: s, $options: 'i' } },
      { fullName: { $regex: s, $options: 'i' } },
      { 'profile.fullName': { $regex: s, $options: 'i' } },
      { email: { $regex: s, $options: 'i' } },
      { 'profile.email': { $regex: s, $options: 'i' } },
      { phone: { $regex: s, $options: 'i' } },
      { jobTitle: { $regex: s, $options: 'i' } },
    ];
  }

  if (req.query.dateFrom || req.query.dateTo) {
    filter.createdAt = {};
    if (req.query.dateFrom) filter.createdAt.$gte = new Date(String(req.query.dateFrom));
    if (req.query.dateTo) filter.createdAt.$lte = new Date(String(req.query.dateTo));
  }

  const [items, total, allApps] = await Promise.all([
    CareerApplicationModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    CareerApplicationModel.countDocuments(filter),
    CareerApplicationModel.find({}, 'status screeningResult.score aiScore').lean(),
  ]);

  // Compute stats across all applications
  let receivedCount = 0;
  let shortlistedCount = 0;
  let interviewCount = 0;
  let rejectedCount = 0;
  let hiredCount = 0;
  let totalScore = 0;
  let scoreCount = 0;

  for (const app of allApps) {
    const st = String(app.status || '');
    if (st === 'received' || st === 'pending' || st === 'reviewed') receivedCount++;
    else if (st === 'shortlisted') shortlistedCount++;
    else if (st === 'interview_scheduled') interviewCount++;
    else if (st === 'rejected') rejectedCount++;
    else if (st === 'hired') hiredCount++;

    const score = (app as any).screeningResult?.score ?? app.aiScore;
    if (typeof score === 'number' && score > 0) {
      totalScore += score;
      scoreCount++;
    }
  }

  const stats = {
    total: allApps.length,
    received: receivedCount,
    shortlisted: shortlistedCount,
    interview: interviewCount,
    rejected: rejectedCount,
    hired: hiredCount,
    averageMatch: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
  };

  successResponse(
    res,
    {
      items,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      stats,
    },
    'Applications retrieved'
  );
});

// GET /careers/admin/applications/export.csv
export const exportApplicationsCsv = asyncHandler(async (_req: Request, res: Response) => {
  const apps = await CareerApplicationModel.find().sort({ createdAt: -1 }).lean();

  const headers = [
    'Application ID',
    'Candidate Name',
    'Email',
    'Phone',
    'Job Title',
    'Match Score',
    'Match Level',
    'Status',
    'Notice Period',
    'Expected CTC',
    'Submitted Date',
  ];

  const rows = apps.map((app) => [
    app.applicationId || String(app._id),
    `"${(app.profile?.fullName || app.fullName || '').replace(/"/g, '""')}"`,
    `"${(app.profile?.email || app.email || '').replace(/"/g, '""')}"`,
    `"${(app.profile?.phone || app.phone || '').replace(/"/g, '""')}"`,
    `"${(app.jobTitle || '').replace(/"/g, '""')}"`,
    (app as any).screeningResult?.score ?? app.aiScore ?? '',
    (app as any).screeningResult?.level || '',
    app.status,
    `"${(app.details?.noticePeriod || app.noticePeriod || '').replace(/"/g, '""')}"`,
    `"${(app.details?.expectedCtc || app.expectedCTC || '').replace(/"/g, '""')}"`,
    new Date(app.createdAt).toISOString(),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="ensis-career-applications.csv"');
  res.status(200).send(csvContent);
});

// GET /careers/admin/applications/:id
export const getApplicationById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const application = await CareerApplicationModel.findOne({
    $or: [{ applicationId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
  }).lean();

  if (!application) {
    throw new AppError(404, 'Application not found');
  }

  // Generate signed links for attached documents
  const docsWithSignedUrls = (application.documents || []).map((doc) => ({
    ...doc,
    downloadUrl: generateSignedUrl(doc.fileId),
  }));

  successResponse(
    res,
    {
      ...application,
      documents: docsWithSignedUrls,
    },
    'Application details retrieved'
  );
});

// PATCH /careers/admin/applications/:id/status
export const updateApplicationStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, note, notifyCandidate, interviewDetails } = req.body || {};

  const allowedStatuses: ApplicationStatus[] = [
    'received',
    'shortlisted',
    'interview_scheduled',
    'rejected',
    'hired',
  ];

  if (!status || !allowedStatuses.includes(status)) {
    throw new AppError(400, `Invalid status. Allowed: ${allowedStatuses.join(', ')}`);
  }

  const application = await CareerApplicationModel.findOne({
    $or: [{ applicationId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
  });

  if (!application) {
    throw new AppError(404, 'Application not found');
  }

  const userEmail = (req as any).user?.email || 'Admin';

  application.status = status;
  application.statusHistory.push({
    status,
    changedAt: new Date(),
    changedBy: userEmail,
    note: note || `Status changed to ${status}`,
  });

  if (note) {
    application.internalNotes.push({
      note,
      createdAt: new Date(),
      author: userEmail,
    });
  }

  if (status === 'interview_scheduled' && interviewDetails) {
    application.interview = interviewDetails;
  }

  await application.save();

  if (notifyCandidate) {
    const job = await CareerModel.findById(application.jobId);
    if (job) {
      setImmediate(() => {
        sendCandidateStatusUpdateEmail(
          application,
          job,
          status,
          note,
          interviewDetails
        ).catch((err) => {
          console.error('[Career Application] Status update email warning:', err);
        });
      });
    }
  }

  successResponse(res, application, 'Application status updated');
});

// GET /careers/admin/files/:fileId/signed-url
export const getFileSignedUrl = asyncHandler(async (req: Request, res: Response) => {
  const { fileId } = req.params;
  await getPrivateFile(fileId);
  const signedUrl = generateSignedUrl(fileId, 60); // 1 hour for admin view
  successResponse(res, { fileId, signedUrl }, 'Signed URL generated');
});

// GET /careers/admin/files/:fileId/download
export const downloadPrivateFile = asyncHandler(async (req: Request, res: Response) => {
  const { fileId } = req.params;
  const { expires, sig } = req.query;

  const isSigned =
    typeof expires === 'string' &&
    typeof sig === 'string' &&
    verifySignedUrlSignature(fileId, expires, sig);

  // If not a valid signed URL, verify admin authentication
  const isAdmin = (req as any).user && ['ADMIN', 'SUPER_ADMIN'].includes((req as any).user?.role);

  if (!isSigned && !isAdmin) {
    throw new AppError(403, 'Access denied. Valid signature or admin credentials required.');
  }

  const fileDoc = await getPrivateFile(fileId);

  if (!fs.existsSync(fileDoc.storagePath)) {
    throw new AppError(404, 'File not found on storage disk');
  }

  res.setHeader('Content-Type', fileDoc.mimeType || 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(fileDoc.fileName)}"`
  );

  const fileStream = fs.createReadStream(fileDoc.storagePath);
  fileStream.pipe(res);
});
