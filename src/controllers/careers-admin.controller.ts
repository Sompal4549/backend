import { Request, Response } from 'express';
import { CareerModel, JobStatus } from '../models/career.model';
import applicationModel from '../models/applicationModel';
import { asyncHandler } from '../utils/async-handler';
import { successResponse } from '../utils/api-response';
import { AppError } from '../utils/app-error';
import { generateSlug } from '../utils/generate-slug';
import { generateJobDescriptionWithAI } from '../services/ai-cv.service';

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
  'coverImage', 'shortDescription', 'aiCheckPoints',
];
const STATUSES: JobStatus[] = ['DRAFT', 'OPEN', 'CLOSED'];

const experienceLabel = (min?: unknown, max?: unknown) => {
  const lo = Number(min);
  const hi = Number(max);
  if (Number.isFinite(lo) && Number.isFinite(hi) && hi > 0) return lo === hi ? `${lo} Years` : `${lo} – ${hi} Years`;
  if (Number.isFinite(lo) && lo > 0) return `${lo}+ Years`;
  return 'Any';
};

export const ensureUniqueSlug = async (rawSlug: string, excludeId?: string): Promise<string> => {
  let slug = generateSlug(rawSlug);
  let candidate = slug;
  let counter = 2;
  while (await CareerModel.exists({ slug: candidate, _id: { $ne: excludeId } })) {
    candidate = `${slug}-${counter}`;
    counter++;
  }
  return candidate;
};

/** Admin body → stored job, keeping the website's fields in step */
const fromAdmin = async (body: Record<string, unknown>, current?: Record<string, unknown>) => {
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

  const desiredSlug = String(doc.slug || merged.slug || (merged.title ? generateSlug(String(merged.title)) : ''));
  if (desiredSlug) {
    doc.slug = await ensureUniqueSlug(desiredSlug, current?._id ? String(current._id) : undefined);
  }

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
  const jobData = await fromAdmin(body);
  const job = await CareerModel.create(jobData);
  successResponse(res, toAdmin(job.toObject()), 'Job created', 201);
});

// PATCH /careers/admin/jobs/:id
export const updateJob = asyncHandler(async (req: Request, res: Response) => {
  const current = await CareerModel.findById(req.params.id).lean().catch(() => null);
  if (!current) throw new AppError(404, 'Job not found');
  const updateData = await fromAdmin(req.body || {}, current as any);
  const job = await CareerModel.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true }).lean();
  successResponse(res, toAdmin(job), 'Job updated');
});

// DELETE /careers/admin/jobs/:id
export const deleteJob = asyncHandler(async (req: Request, res: Response) => {
  const job = await CareerModel.findByIdAndDelete(req.params.id).catch(() => null);
  if (!job) throw new AppError(404, 'Job not found');
  successResponse(res, { message: 'Job deleted' }, 'Job deleted');
});

// POST /careers/admin/jobs/generate-description
export const generateJobDescription = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body || {};
  if (!String(body.title || '').trim()) {
    throw new AppError(400, 'Job title is required');
  }
  const result = await generateJobDescriptionWithAI(body);
  successResponse(res, result, 'Job description generated successfully');
});

/* ---------------- Job description export (Job Postings → Download) ---------------- */

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const textList = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((v) => String(v ?? '').trim()).filter(Boolean) : [];

const ctcLabel = (job: any) => {
  if (job.salary) return String(job.salary);
  const min = Number(job.ctcMin);
  const max = Number(job.ctcMax);
  if (min > 0 && max > 0) return `₹${min} – ${max} LPA`;
  if (min > 0) return `₹${min}+ LPA`;
  return '';
};

/** Word-compatible HTML (.doc) — no extra dependency needed; Word, LibreOffice and Google Docs open it. */
const buildJobDoc = (job: any) => {
  const section = (title: string, body: string) => (body ? `<h2>${escapeHtml(title)}</h2>${body}` : '');
  const paragraph = (value: unknown) => (String(value ?? '').trim() ? `<p>${escapeHtml(value)}</p>` : '');
  const bullets = (value: unknown) => {
    const items = textList(value);
    return items.length ? `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>` : '';
  };
  const pairs = (value: unknown, key: 'result' | 'measurement') => {
    const rows = Array.isArray(value) ? value.filter((r: any) => r?.label) : [];
    return rows.length
      ? `<ul>${rows.map((r: any) => `<li><b>${escapeHtml(r.label)}</b>${r[key] ? ` — ${escapeHtml(r[key])}` : ''}</li>`).join('')}</ul>`
      : '';
  };

  const details: [string, unknown][] = [
    ['Designation', job.designation],
    ['Department', job.department],
    ['Job Code', job.jobCode],
    ['Location', job.location],
    ['Employment Type', job.employmentType || job.type],
    ['Workplace Type', job.workplaceType],
    ['Experience', experienceLabel(job.experienceMin, job.experienceMax)],
    ['Openings', job.totalOpenings],
    ['CTC', ctcLabel(job)],
    ['Education', job.educationRequirements],
    ['Reporting To', job.reportingTo],
    ['Apply By', job.applicationClosingDate ? new Date(job.applicationClosingDate).toDateString() : ''],
  ];
  const detailRows = details
    .filter(([, v]) => String(v ?? '').trim())
    .map(([k, v]) => `<tr><td class="k">${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`)
    .join('');

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${escapeHtml(job.title)}</title>
<style>
body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#222}
h1{font-size:20pt;margin:0 0 4pt}h2{font-size:13pt;margin:14pt 0 4pt;color:#1f3a5f}
table{border-collapse:collapse;margin-top:8pt}td{padding:3pt 8pt;border:1px solid #ccc;vertical-align:top}td.k{font-weight:bold;background:#f2f4f7;width:150pt}
</style></head>
<body>
<h1>${escapeHtml(job.title)}</h1>
${job.company ? `<p>${escapeHtml(job.company)}</p>` : ''}
${detailRows ? `<table>${detailRows}</table>` : ''}
${section('About the Company', paragraph(job.aboutCompany))}
${section('Role Objective', paragraph(job.roleObjective))}
${section('Job Description', paragraph(job.description || job.shortDescription))}
${section('Key Responsibilities', bullets(job.responsibilities))}
${section('Requirements', bullets(job.requirements))}
${section('Required Skills', bullets(job.skills))}
${section('Preferred Skills', bullets(job.preferredSkills))}
${section('Preferred Qualifications', bullets(job.preferredQualifications))}
${section('Target Industry Segments', bullets(job.targetIndustrySegments))}
${section('Specific Experience', paragraph(job.specificExperience))}
${section('Key Result Areas (KRAs)', pairs(job.kras, 'result'))}
${section('Key Performance Indicators (KPIs)', pairs(job.kpis, 'measurement'))}
</body></html>`;
};

// GET /careers/admin/jobs/:id/export → job description as a Word document download
export const exportJobDocument = asyncHandler(async (req: Request, res: Response) => {
  const job = await CareerModel.findById(req.params.id).lean().catch(() => null);
  if (!job) throw new AppError(404, 'Job not found');
  const base = String((job as any).title || 'job-description').replace(/[^a-zA-Z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || 'job-description';

  res.setHeader('Content-Type', 'application/msword; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${base}.doc"`);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  res.send(String.fromCharCode(0xfeff) + buildJobDoc(job)); // BOM so Word reads it as UTF-8
});
