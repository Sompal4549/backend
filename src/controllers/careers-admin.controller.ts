import { Request, Response } from 'express';
import { CareerModel, JobStatus } from '../models/career.model';
import applicationModel from '../models/applicationModel';
import { asyncHandler } from '../utils/async-handler';
import { successResponse } from '../utils/api-response';
import { AppError } from '../utils/app-error';
import { generateSlug } from '../utils/generate-slug';

/*
 * Admin Job Postings (ensis-admin lib/careersApi.ts JobPosting). Jobs live in the Career collection;
 * the website still reads title / department / location / type / experience / status from it.
 */

/** Fields the admin may set on a job */
const JOB_FIELDS = [
  'title', 'designation', 'company', 'projectEvent', 'department', 'jobCode', 'location',
  'employmentType', 'workplaceType', 'totalOpenings', 'experienceMin', 'experienceMax', 'educationRequirements',
  'ctcMin', 'ctcMax', 'salaryType', 'performanceIncentiveApplicable', 'incentiveType', 'salary',
  'description', 'aboutCompany', 'roleObjective', 'skills', 'preferredSkills', 'targetIndustrySegments',
  'specificExperience', 'responsibilities', 'requirements', 'preferredQualifications', 'reportingTo',
  'kras', 'kpis', 'referenceIndustries', 'screeningQuestions', 'acceptOnlineApplications', 'aiCvScreening',
  'cvUploadMandatory', 'candidatePhotoMandatory', 'allowFresherCandidates', 'allowCurrentlyNotEmployed',
  'allowCvReplacement', 'eligibilityThreshold', 'partialMatchMin', 'partialMatchMax', 'showMatchScoreToCandidate',
  'showMatchBreakdown', 'featuredJob', 'applicationOpenDate', 'applicationClosingDate', 'tags', 'slug',
];
const STATUSES: JobStatus[] = ['DRAFT', 'OPEN', 'CLOSED'];

const experienceLabel = (min?: unknown, max?: unknown) => {
  const lo = Number(min);
  const hi = Number(max);
  if (Number.isFinite(lo) && Number.isFinite(hi) && hi > 0) return lo === hi ? `${lo} Years` : `${lo} – ${hi} Years`;
  if (Number.isFinite(lo) && lo > 0) return `${lo}+ Years`;
  return 'Any';
};

/** Admin body → stored job, keeping the website's fields in step */
const fromAdmin = (body: Record<string, unknown>, current?: Record<string, unknown>) => {
  const doc: Record<string, unknown> = {};
  for (const key of JOB_FIELDS) if (body[key] !== undefined) doc[key] = body[key];
  const merged = { ...(current || {}), ...doc };

  if (body.status !== undefined) {
    const status = String(body.status).toUpperCase() as JobStatus;
    if (!STATUSES.includes(status)) throw new AppError(400, 'Invalid status');
    doc.jobStatus = status;
  }
  const jobStatus = (doc.jobStatus || merged.jobStatus || 'DRAFT') as JobStatus;
  doc.jobStatus = jobStatus;
  doc.status = jobStatus === 'OPEN' ? 'active' : 'closed';
  if (jobStatus === 'OPEN' && !merged.publishedAt) doc.publishedAt = new Date();
  if (jobStatus === 'CLOSED' && !merged.closedAt) doc.closedAt = new Date();

  doc.type = String(merged.employmentType || merged.type || 'Full Time');
  doc.experience = experienceLabel(merged.experienceMin, merged.experienceMax);
  if (!merged.slug && merged.title) doc.slug = generateSlug(String(merged.title));
  return doc;
};

/** Stored job → admin JobPosting */
const toAdmin = (doc: any, applicationsCount = 0) => ({
  ...doc,
  _id: String(doc._id),
  employmentType: doc.employmentType || doc.type,
  totalOpenings: Number(doc.totalOpenings) || 1,
  experienceMin: Number(doc.experienceMin) || 0,
  experienceMax: Number(doc.experienceMax) || 0,
  skills: doc.skills || [],
  responsibilities: doc.responsibilities || [],
  requirements: doc.requirements || [],
  views: Number(doc.views) || 0,
  applicationsCount,
  status: doc.jobStatus || (doc.status === 'active' ? 'OPEN' : 'CLOSED'),
});

/** Applications per job title (applications store the job they were sent for in department / jobTitle) */
const applicationCounts = async () => {
  const rows = await applicationModel.aggregate([
    { $group: { _id: { $ifNull: ['$jobTitle', '$department'] }, count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r: { _id: string; count: number }) => [String(r._id), r.count]));
};

// GET /careers/admin/jobs
export const listJobs = asyncHandler(async (_req: Request, res: Response) => {
  const [jobs, counts] = await Promise.all([CareerModel.find().sort({ createdAt: -1 }).lean(), applicationCounts()]);
  successResponse(res, jobs.map((j: any) => toAdmin(j, counts.get(j.title) || 0)), 'Jobs retrieved');
});

// GET /careers/admin/jobs/:id
export const getJob = asyncHandler(async (req: Request, res: Response) => {
  const job = await CareerModel.findById(req.params.id).lean().catch(() => null);
  if (!job) throw new AppError(404, 'Job not found');
  const counts = await applicationCounts();
  successResponse(res, toAdmin(job, counts.get((job as any).title) || 0), 'Job retrieved');
});

// POST /careers/admin/jobs
export const createJob = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body || {};
  if (!String(body.title || '').trim()) throw new AppError(400, 'Job title is required');
  if (!String(body.department || '').trim()) throw new AppError(400, 'Department is required');
  if (!String(body.location || '').trim()) throw new AppError(400, 'Location is required');
  const job = await CareerModel.create(fromAdmin(body));
  successResponse(res, toAdmin(job.toObject()), 'Job created', 201);
});

// PATCH /careers/admin/jobs/:id
export const updateJob = asyncHandler(async (req: Request, res: Response) => {
  const current = await CareerModel.findById(req.params.id).lean().catch(() => null);
  if (!current) throw new AppError(404, 'Job not found');
  const job = await CareerModel.findByIdAndUpdate(req.params.id, { $set: fromAdmin(req.body || {}, current as any) }, { new: true }).lean();
  successResponse(res, toAdmin(job), 'Job updated');
});

// DELETE /careers/admin/jobs/:id
export const deleteJob = asyncHandler(async (req: Request, res: Response) => {
  const job = await CareerModel.findByIdAndDelete(req.params.id).catch(() => null);
  if (!job) throw new AppError(404, 'Job not found');
  successResponse(res, { message: 'Job deleted' }, 'Job deleted');
});
