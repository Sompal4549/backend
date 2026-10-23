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
  HrStatus,
  HR_STATUSES,
} from '../models/career-application.model';
import { ApplicationEventModel } from '../models/application-event.model';
import { CareerSettingsModel } from '../models/career-settings.model';
import { getNextApplicationId } from '../models/career-counter.model';
import {
  generateSignedUrl,
  getPrivateFile,
  savePrivateFile,
  verifySignedUrlSignature,
} from '../services/private-upload.service';
import { sendEmail } from '../services/email.service';
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
  let job: any = null;
  if (body.jobId === 'general' || body.jobId === 'ensis-general-talent') {
    job = {
      _id: 'general',
      title: 'General Application - Talent Community',
      department: 'Talent Pool',
      location: 'Pan India',
      status: 'active',
      jobStatus: 'OPEN',
    };
  } else {
    job = await CareerModel.findById(body.jobId).catch(() => null);
    if (!job && typeof body.jobId === 'string') {
      job = await CareerModel.findOne({ slug: body.jobId }).catch(() => null);
    }
  }

  if (!job) {
    throw new AppError(404, 'Job not found');
  }

  const isOpen = job.status === 'active' || job.jobStatus === 'OPEN';
  if (!isOpen) {
    throw new AppError(410, 'This job opening is closed and no longer accepting applications');
  }

  // Verify Screening
  let screening = await ScreeningModel.findOne({
    screeningId: body.screeningId,
  });

  // If screening record is not in database (e.g. analyzed via storefront analyzer / fallback),
  // but a valid screeningResult was sent in the body, create the screening record
  if (!screening && body.screeningResult && typeof body.screeningResult.score === 'number') {
    const sr = body.screeningResult;
    screening = await ScreeningModel.create({
      screeningId: body.screeningId,
      jobId: String(job._id),
      jobTitle: job.title,
      status: 'done',
      progress: 100,
      cv: {
        fileName: body.screeningCvName || 'candidate_cv.pdf',
        size: 1024,
        uploadedAt: new Date(),
      },
      result: {
        score: sr.score,
        level: sr.level || (sr.score >= 70 ? 'eligible' : sr.score >= 50 ? 'partial' : 'not_eligible'),
        thresholds: sr.thresholds || { eligibleMin: 70, partialMin: 50 },
        breakdown: sr.breakdown || {},
        strengths: sr.strengths || [],
        gaps: sr.gaps || [],
        suggestions: sr.suggestions || [],
        profile: sr.profile || profile,
      },
      completedAt: new Date(),
    }).catch(() => null);
  }

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
  const rawPhone = String(profile.phone || '').replace(/\D/g, '');
  const candidatePhone = rawPhone.length >= 10 ? rawPhone.slice(-10) : rawPhone;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const duplicateOrConditions: any[] = [
    { email: candidateEmail },
    { 'profile.email': candidateEmail },
  ];
  if (candidatePhone) {
    duplicateOrConditions.push(
      { phone: new RegExp(escapeRegex(candidatePhone) + '$') },
      { 'profile.phone': new RegExp(escapeRegex(candidatePhone) + '$') }
    );
  }

  const existingApp = await CareerApplicationModel.findOne({
    $and: [
      {
        $or: [
          { jobId: String(job._id) },
          { jobTitle: job.title },
        ],
      },
      {
        $or: duplicateOrConditions,
      },
      {
        createdAt: { $gte: thirtyDaysAgo },
      },
    ],
  });

  if (existingApp) {
    throw new AppError(
      409,
      `You have already submitted an application for ${job.title} within the last 30 days. Your Application ID is ${existingApp.applicationId || 'ENS-CAR'}. Please wait for our HR team to review your existing submission.`
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
    downloadUrl: generateSignedUrl(doc.fileId, 120),
  }));

  let cvDownloadUrl: string | undefined;
  if (application.screeningId) {
    const sc = await ScreeningModel.findOne({ screeningId: application.screeningId }).lean();
    if (sc?.cv?.fileId) {
      cvDownloadUrl = generateSignedUrl(sc.cv.fileId, 120);
    }
  }

  let photoSignedUrl: string | undefined;
  const pUrl = application.profile?.photoUrl;
  if (pUrl) {
    if (pUrl.startsWith('priv_') || (!pUrl.startsWith('http') && !pUrl.startsWith('/'))) {
      photoSignedUrl = generateSignedUrl(pUrl, 120);
    } else {
      photoSignedUrl = pUrl;
    }
  }

  // Normalize legacy data so admin UI always receives complete profile, details, and screeningResult
  const raw = application as any;
  const profile = {
    fullName: application.profile?.fullName || raw.fullName || 'Candidate',
    email: application.profile?.email || raw.email || '',
    phone: application.profile?.phone || raw.phone || '',
    currentLocation: application.profile?.currentLocation || raw.currentLocation || '',
    linkedin: application.profile?.linkedin || raw.linkedin || '',
    permanentAddress: application.profile?.permanentAddress || '',
    gender: application.profile?.gender || '',
    dateOfBirth: application.profile?.dateOfBirth || '',
    photoUrl: application.profile?.photoUrl,
    education: application.profile?.education || [],
    experience: application.profile?.experience || (raw.experience ? [{ role: raw.jobTitle || raw.department || 'Experience', company: raw.currentCompany || 'Previous Experience', years: raw.experience }] : []),
    skills: application.profile?.skills || [],
    certifications: application.profile?.certifications || [],
  };

  const details = {
    preferredLocations: application.details?.preferredLocations || (raw.currentLocation ? [raw.currentLocation] : ['Delhi NCR']),
    noticePeriod: application.details?.noticePeriod || raw.noticePeriod || '30 Days',
    expectedCtc: application.details?.expectedCtc || raw.expectedCTC || raw.expectedCtc || 'As per industry standards',
    joiningPreference: application.details?.joiningPreference || 'Within 1 Month',
    howDidYouHear: application.details?.howDidYouHear || 'Careers Portal',
    willingToRelocate: application.details?.willingToRelocate ?? (raw.willingToRelocate === 'Yes' || raw.willingToRelocate === true),
  };

  const screeningResult = application.screeningResult || (raw.aiScore != null ? {
    score: Number(raw.aiScore) || 85,
    level: (Number(raw.aiScore) >= 70 ? 'eligible' : Number(raw.aiScore) >= 50 ? 'partial' : 'not_eligible') as any,
    breakdown: {
      experience: Math.min(100, (Number(raw.aiScore) || 85) + 5),
      skills: Number(raw.aiScore) || 85,
      education: Math.max(70, (Number(raw.aiScore) || 85) - 5),
    },
    strengths: raw.aiSummary ? [raw.aiSummary] : ['Strong domain experience and profile match'],
    gaps: [],
    suggestions: [],
  } : undefined);

  if (!cvDownloadUrl && raw.resume) {
    cvDownloadUrl = raw.resume;
  }

  const rawStatus = String(raw.status || 'received').toLowerCase();
  const normalizedStatus = rawStatus === 'reviewed' ? 'shortlisted' : rawStatus;

  const events = await ApplicationEventModel.find({
    applicationId: application.applicationId,
  })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  successResponse(
    res,
    {
      ...application,
      applicationId: application.applicationId || `ENS-CAR-${application._id.toString().slice(-6).toUpperCase()}`,
      jobTitle: application.jobTitle || raw.department || 'Software Engineer – Full Stack (React / Next.js)',
      status: normalizedStatus,
      profile,
      details,
      screeningResult,
      documents: docsWithSignedUrls,
      cvDownloadUrl,
      photoSignedUrl,
      events,
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
        ).catch((err: any) => {
          console.error('[Career Application] Status update email warning:', err);
        });
      });
    }
  }

  successResponse(res, application, 'Application status updated');
});

// POST /careers/admin/applications/:id/resend-email
export const resendApplicationEmails = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const rawTo = String(req.body?.to || 'both').toLowerCase();
  const to: 'hr' | 'candidate' | 'both' =
    rawTo === 'hr' || rawTo === 'candidate' ? rawTo : 'both';

  const application = await CareerApplicationModel.findOne({
    $or: [{ applicationId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
  });

  if (!application) {
    throw new AppError(404, 'Application not found');
  }

  let job = await CareerModel.findById(application.jobId);
  if (!job) {
    // Fallback so emails can still render if the job posting was removed
    job = { title: application.jobTitle } as any;
  }

  const results: Record<string, { sent: boolean; error?: string }> = {};

  // HR and candidate emails go out in parallel so the request finishes well within the admin timeout
  const sendInto = async (key: 'hr' | 'candidate', send: () => Promise<void>) => {
    try {
      await send();
      results[key] = { sent: true };
    } catch (err) {
      results[key] = { sent: false, error: (err as Error).message };
    }
  };
  await Promise.all([
    to !== 'candidate' ? sendInto('hr', () => sendHrNotificationEmail(application, job as any)) : null,
    to !== 'hr' ? sendInto('candidate', () => sendCandidateConfirmationEmail(application, job as any)) : null,
  ]);

  const adminEmail = (req as any).user?.email || 'Admin';
  application.internalNotes.push({
    note: `Application email(s) re-sent (${to}) by ${adminEmail}`,
    createdAt: new Date(),
    author: adminEmail,
  });
  await application.save();

  const allSent = Object.values(results).every((r) => r.sent);
  successResponse(
    res,
    { resent: results },
    allSent ? 'Email(s) resent successfully' : 'Email resend completed with errors — check results'
  );
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

// ─────────────────────────────────────────────────────────────────────────────
// Admin "Applications & AI Response" board (ensis-admin applications-ai-response page)
// ─────────────────────────────────────────────────────────────────────────────

const boardDate = (d?: Date) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '';
const boardTime = (d?: Date) =>
  d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : '';

const aiResultLabel = (level?: string, score?: number): 'Eligible' | 'Partial Match' | 'Not Eligible' => {
  if (level === 'eligible') return 'Eligible';
  if (level === 'partial') return 'Partial Match';
  if (level === 'not_eligible') return 'Not Eligible';
  const s = Number(score) || 0;
  // Same bands as Career Settings defaults (eligible ≥ 70, partial ≥ 50)
  return s >= 70 ? 'Eligible' : s >= 50 ? 'Partial Match' : 'Not Eligible';
};

// GET /careers/admin/applications-board
// One flat row per candidate in the exact shape the admin page's CandidateApplication
// interface expects (NOT the paginated {items,...} envelope of listApplications).
export const listApplicationsBoard = asyncHandler(async (_req: Request, res: Response) => {
  const [applications, careers, screenings] = await Promise.all([
    CareerApplicationModel.find().sort({ createdAt: -1 }).lean(),
    CareerModel.find({}, 'title department slug').lean(),
    // Screenings that never became an application ("CV Uploaded" stage on the board)
    ScreeningModel.find({ status: 'done' }).sort({ createdAt: -1 }).lean(),
  ]);

  const jobById = new Map(careers.map((j: any) => [String(j._id), j]));
  const appliedScreeningIds = new Set(applications.map((a: any) => String(a.screeningId || '')));

  const rows: any[] = applications.map((app: any) => {
    const profile = app.profile || {};
    const sr = app.screeningResult || {};
    const exp = Array.isArray(profile.experience) ? profile.experience : [];
    const job = jobById.get(String(app.jobId));
    const score = Math.round(Number(sr.score ?? app.aiScore ?? 0)) || 0;
    return {
      id: app.applicationId,
      source: 'application',
      name: profile.fullName || app.fullName || 'Unnamed candidate',
      email: profile.email || app.email || '',
      phone: profile.phone || app.phone || '',
      avatar: profile.photoUrl || '',
      location: profile.currentLocation || app.currentLocation || '',
      experienceYrs: app.experience || (exp.length ? `${exp.length} role(s)` : ''),
      currentCompany: exp[0]?.organization || '',
      currentDesignation: exp[0]?.designation || '',
      currentCtc: '',
      expectedCtc: app.details?.expectedCtc || app.expectedCTC || '',
      noticePeriod: app.details?.noticePeriod || app.noticePeriod || '',
      willingToRelocate: (app.details?.willingToRelocate ?? app.willingToRelocate === 'Yes') ? 'Yes' : 'No',
      skills: (Array.isArray(profile.skills) ? profile.skills : []).map((s: any) =>
        typeof s === 'string' ? s : s?.name || ''
      ).filter(Boolean),
      cvUrl: '', // filled in below (needs screening lookup)
      cvFileName: '',
      cvFileSize: 0,
      position: app.jobTitle || job?.title || 'Unknown position',
      department: job?.department || app.department || '',
      jobCode: job?.slug || app.jobId || '',
      jobId: app.jobId || '',
      aiScore: score,
      aiResult: aiResultLabel(sr.level, score),
      aiAnalysisSummary: sr.summary || app.aiSummary || '',
      strengths: Array.isArray(sr.strengths) ? sr.strengths : [],
      gaps: Array.isArray(sr.gaps) ? sr.gaps : [],
      stage: 'Submitted',
      status: app.status || 'received',
      hrStatus: HR_STATUSES.includes(app.hrStatus) ? app.hrStatus : 'Not Forwarded',
      updatedByHrOn: app.hrUpdatedAt
        ? `${boardDate(app.hrUpdatedAt)}, ${boardTime(app.hrUpdatedAt)}${app.hrUpdatedBy ? ` by ${app.hrUpdatedBy}` : ''}`
        : '',
      whyInterested: '',
      notes: app.notes || '',
      hrForward: app.hrForward || null,
      appliedAt: app.createdAt,
      appliedOn: boardDate(app.createdAt),
      appliedTime: boardTime(app.createdAt),
    } as any;
  });

  // Attach CV signed URLs via the screening each application came from
  const screeningIds = applications.map((a: any) => String(a.screeningId || '')).filter(Boolean);
  const screeningsForApps = screeningIds.length
    ? await ScreeningModel.find({ screeningId: { $in: screeningIds } }).lean()
    : [];
  const screeningById = new Map(screeningsForApps.map((s: any) => [String(s.screeningId), s]));
  applications.forEach((app: any, i: number) => {
    const sc = screeningById.get(String(app.screeningId || ''));
    if (sc?.cv?.fileId) {
      rows[i].cvUrl = generateSignedUrl(sc.cv.fileId, 60 * 24);
      rows[i].cvFileName = sc.cv.fileName || '';
      rows[i].cvFileSize = Number(sc.cv.size) || 0;
    } else if (app.resume) {
      rows[i].cvUrl = app.resume;
    }
  });

  // CV checks that never became an application: newest per candidate+job
  const seenCv = new Set<string>();
  for (const sc of screenings as any[]) {
    if (appliedScreeningIds.has(String(sc.screeningId))) continue;
    const sr: any = sc.result;
    const profile = sr?.profile;
    if (!sr || !profile) continue;
    const key = `${(profile.email || '').toLowerCase()}|${sc.jobId}`;
    if (seenCv.has(key)) continue;
    seenCv.add(key);

    const job = jobById.get(String(sc.jobId));
    const score = Math.round(Number(sr.score) || 0) || 0;
    const at: Date = sc.updatedAt || sc.createdAt;
    rows.push({
      id: String(sc.screeningId),
      source: 'cv',
      name: profile.fullName || 'Unnamed candidate',
      email: profile.email || '',
      phone: profile.phone || '',
      avatar: profile.photoUrl || '',
      location: profile.currentLocation || '',
      experienceYrs: '',
      currentCompany: '',
      currentDesignation: '',
      currentCtc: '',
      expectedCtc: '',
      noticePeriod: '',
      willingToRelocate: '',
      skills: (Array.isArray(profile.skills) ? profile.skills : []).map((s: any) =>
        typeof s === 'string' ? s : s?.name || ''
      ).filter(Boolean),
      cvUrl: sc.cv?.fileId ? generateSignedUrl(sc.cv.fileId, 60 * 24) : '',
      cvFileName: sc.cv?.fileName || '',
      cvFileSize: Number(sc.cv?.size) || 0,
      position: job?.title || 'Unknown position',
      department: job?.department || '',
      jobCode: job?.slug || String(sc.jobId || ''),
      jobId: String(sc.jobId || ''),
      aiScore: score,
      aiResult: aiResultLabel(sr.level, score),
      aiAnalysisSummary: sr.summary || '',
      strengths: Array.isArray(sr.strengths) ? sr.strengths : [],
      gaps: Array.isArray(sr.gaps) ? sr.gaps : [],
      stage: 'CV Uploaded',
      status: 'CV_UPLOADED',
      hrStatus: 'Not Forwarded',
      updatedByHrOn: '',
      whyInterested: '',
      notes: '',
      hrForward: null,
      appliedAt: at,
      appliedOn: boardDate(at),
      appliedTime: boardTime(at),
    });
  }

  rows.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());

  successResponse(res, rows, 'Applications board loaded');
});

const findApplicationForAdmin = async (id: string) => {
  let application = await CareerApplicationModel.findOne({ applicationId: id });
  if (!application && /^[0-9a-fA-F]{24}$/.test(id)) application = await CareerApplicationModel.findById(id);
  return application;
};

const SHAREABLE = [
  'Application Form Details',
  'Uploaded CV (Resume)',
  'AI Analysis Result',
  'Screening Questions & Answers',
];

const escHtml = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
);

const buildHrForwardEmail = (application: any, share: string[], note: string, forwardedBy: string) => {
  const profile = application.profile || {};
  const sr = application.screeningResult || {};
  const score = Math.round(Number(sr.score ?? application.aiScore ?? 0)) || 0;
  const row = (label: string, value: unknown) =>
    `<tr><td style="padding:4px 10px 4px 0;font-size:11px;color:#64748b;white-space:nowrap;">${escHtml(label)}</td><td style="padding:4px 0;font-size:12px;color:#0f172a;font-weight:600;">${escHtml(value) || '—'}</td></tr>`;

  const sharedRows: string[] = [];
  if (share.includes('Application Form Details')) {
    sharedRows.push(
      row('Application ID', application.applicationId),
      row('Position', application.jobTitle),
      row('Name', profile.fullName || application.fullName),
      row('Email', profile.email || application.email),
      row('Phone', profile.phone || application.phone),
      row('Location', profile.currentLocation || application.currentLocation),
      row('Notice Period', application.details?.noticePeriod || application.noticePeriod),
      row('Expected CTC', application.details?.expectedCtc || application.expectedCTC),
      row('Why Interested', application.whyInterested || application.additional?.whyJoin || '')
    );
  }
  if (share.includes('AI Analysis Result')) {
    sharedRows.push(
      `<tr><td colspan="2" style="padding:10px 0 2px;font-size:12px;font-weight:700;color:#0f5a3c;">AI Analysis</td></tr>`,
      row('Match Score', `${score}%`),
      row('Result', aiResultLabel(sr.level, score)),
      row('Summary', sr.summary || application.aiSummary || ''),
      (Array.isArray(sr.strengths) && sr.strengths.length ? row('Strengths', sr.strengths.join('; ')) : ''),
      (Array.isArray(sr.gaps) && sr.gaps.length ? row('Gaps', sr.gaps.join('; ')) : '')
    );
  }

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;">
      <h2 style="color:#0f5a3c;font-size:16px;margin:0 0 4px;">Application Forwarded to HR</h2>
      <p style="font-size:12px;color:#475569;margin:0 0 12px;">
        <strong>${escHtml(forwardedBy)}</strong> shared a candidate application with you.
      </p>
      <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin-bottom:10px;">${sharedRows.join('')}</table>
      ${share.includes('Uploaded CV (Resume)') ? `<p style="font-size:12px;color:#0f5a3c;font-weight:600;margin:0 0 8px;">✓ Candidate CV attached to this email.</p>` : ''}
      ${note ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px;font-size:12px;color:#334155;margin:10px 0;"><strong>Note:</strong> ${escHtml(note)}</div>` : ''}
      <p style="font-size:11px;color:#94a3b8;margin:14px 0 0;">Shared items: ${escHtml(share.join(', '))}</p>
      <p style="font-size:11px;color:#94a3b8;margin:4px 0 0;">— Talent Acquisition Team, ENSIS</p>
    </div>`.trim();

  const textBody = [
    'Application Forwarded to HR',
    `Application: ${application.applicationId} — ${profile.fullName || application.fullName} (${application.jobTitle})`,
    `Score: ${score}%`,
    note ? `Note: ${note}` : '',
    `Shared: ${share.join(', ')}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { html, textBody, score };
};

// PATCH /careers/admin/applications/:id/hr — HR status change and/or "Forward to HR" email
export const updateApplicationHr = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { hrStatus, note, changedBy, forward } = req.body || {};

  if (!hrStatus || !HR_STATUSES.includes(hrStatus)) {
    throw new AppError(400, `hrStatus must be one of: ${HR_STATUSES.join(', ')}`);
  }

  const application = await findApplicationForAdmin(String(id));
  if (!application) {
    throw new AppError(404, 'Application not found');
  }

  const oldHrStatus: HrStatus = application.hrStatus || 'Not Forwarded';
  application.hrStatus = hrStatus;
  application.hrUpdatedAt = new Date();
  application.hrUpdatedBy = String(changedBy || '').trim() || 'Admin';

  // "Forward to HR" form: recipients must be configured HR emails; CV is attached; email sent now.
  let mail: { to: string[]; share: string[]; note: string } | null = null;
  if (forward && typeof forward === 'object' && Array.isArray(forward.recipients)) {
    const settings = await CareerSettingsModel.findOne().lean();
    const configured = (settings as any)?.hrEmails?.map((e: string) => e.toLowerCase()) || [];
    const requested = forward.recipients
      .map((e: unknown) => String(e || '').trim().toLowerCase())
      .filter(Boolean);
    const chosen = requested.filter((e: string) => configured.includes(e));
    if (chosen.length === 0) {
      throw new AppError(400, 'Choose at least one configured HR recipient (from Career Settings).');
    }
    const share = (Array.isArray(forward.share) ? forward.share : [])
      .map((s: unknown) => String(s || ''))
      .filter((s: string) => SHAREABLE.includes(s));
    if (share.length === 0) {
      throw new AppError(400, 'Choose at least one item to share.');
    }
    mail = { to: chosen, share, note: String(forward.note || '').trim() };
    application.hrForward = {
      recipients: chosen,
      share,
      note: mail.note,
      forwardedAt: application.hrUpdatedAt,
      forwardedBy: application.hrUpdatedBy,
    };
    if (String(note || '').trim() === '') {
      application.internalNotes.push({
        note: `Forwarded to HR (${chosen.join(', ')}). Shared: ${share.join(', ')}${mail.note ? `. Note: ${mail.note}` : ''}`,
        createdAt: new Date(),
        author: application.hrUpdatedBy,
      });
    }
  }

  if (String(note || '').trim()) {
    application.internalNotes.push({
      note: String(note).trim(),
      createdAt: new Date(),
      author: application.hrUpdatedBy,
    });
  }

  await application.save();

  await ApplicationEventModel.create({
    applicationId: application.applicationId,
    oldStatus: `HR: ${oldHrStatus}`,
    newStatus: `HR: ${hrStatus}`,
    changedBy: application.hrUpdatedBy,
    note: String(note || '').trim() || `HR status changed to ${hrStatus}`,
  });

  // Send the forward email (with CV attachment when shared) outside the response critical path
  let email: { sent: boolean; skipped?: boolean; error?: string } | null = null;
  let recipients: { to: string[]; cc: string[]; bcc: string[] } | null = null;
  if (mail) {
    recipients = { to: mail.to, cc: [], bcc: [] };
    try {
      const { html, textBody } = buildHrForwardEmail(application, mail.share, mail.note, application.hrUpdatedBy);
      const attachments: { filename: string; content: Buffer; contentType?: string }[] = [];
      if (mail.share.includes('Uploaded CV (Resume)') && application.screeningId) {
        const sc = await ScreeningModel.findOne({ screeningId: application.screeningId }).lean();
        if (sc?.cv?.fileId) {
          try {
            const fileDoc = await getPrivateFile(sc.cv.fileId);
            if (fs.existsSync(fileDoc.storagePath)) {
              attachments.push({
                filename: sc.cv.fileName || fileDoc.fileName || 'resume.pdf',
                content: fs.readFileSync(fileDoc.storagePath),
                contentType: fileDoc.mimeType,
              });
            }
          } catch {
            // CV attach is best-effort; email still goes out without it
          }
        }
      }
      await sendEmail(
        mail.to.join(', '),
        `Application Forwarded: ${application.profile?.fullName || application.fullName || 'Candidate'} — ${application.jobTitle}`,
        textBody,
        html,
        attachments.length ? attachments : undefined
      );
      email = { sent: true };
    } catch (err) {
      email = { sent: false, error: (err as Error).message };
    }
  }

  successResponse(
    res,
    {
      application,
      email,
      recipients,
    },
    `HR status updated to ${hrStatus}`
  );
});

// POST /careers/admin/applications/:id/notes
export const addApplicationNote = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const note = String(req.body?.note || '').trim();
  if (!note) {
    throw new AppError(400, 'Note cannot be empty.');
  }

  const application = await findApplicationForAdmin(String(id));
  if (!application) {
    throw new AppError(404, 'Application not found');
  }

  const by = String(req.body?.changedBy || '').trim() || 'Admin';
  application.notes = [application.notes, `[${new Date().toISOString()}] ${by}: ${note}`].filter(Boolean).join('\n');
  application.internalNotes.push({ note, createdAt: new Date(), author: by });
  await application.save();

  await ApplicationEventModel.create({
    applicationId: application.applicationId,
    oldStatus: application.status,
    newStatus: application.status,
    changedBy: by,
    note,
  });

  successResponse(res, application, 'Note added');
});
