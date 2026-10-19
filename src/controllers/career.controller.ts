import { Request, Response } from 'express';
import { CareerModel } from '../models/career.model';
import { AuthRequest } from '../middlewares/auth.middleware';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { pick } from '../utils/pick';

export const CAREER_EDITABLE_FIELDS = [
  'title', 'designation', 'company', 'projectEvent', 'department', 'jobCode', 'location',
  'employmentType', 'workplaceType', 'totalOpenings', 'experienceMin', 'experienceMax', 'educationRequirements',
  'ctcMin', 'ctcMax', 'salaryType', 'performanceIncentiveApplicable', 'incentiveType', 'salary',
  'description', 'aboutCompany', 'roleObjective', 'skills', 'preferredSkills', 'targetIndustrySegments',
  'specificExperience', 'responsibilities', 'requirements', 'preferredQualifications', 'reportingTo',
  'kras', 'kpis', 'referenceIndustries', 'screeningQuestions', 'acceptOnlineApplications', 'aiCvScreening',
  'cvUploadMandatory', 'candidatePhotoMandatory', 'allowFresherCandidates', 'allowCurrentlyNotEmployed',
  'allowCvReplacement', 'eligibilityThreshold', 'partialMatchMin', 'partialMatchMax', 'showMatchScoreToCandidate',
  'showMatchBreakdown', 'featuredJob', 'applicationOpenDate', 'applicationClosingDate', 'tags', 'slug',
  'status', 'jobStatus', 'type', 'experience', 'isActive', 'orderBy',
  'coverImage', 'shortDescription', 'aiCheckPoints',
] as const;

/**
 * Contract §1 PublicJob projection.
 * Never expose internal fields (CTC ranges, KPIs, internal screening questions, etc.) on public routes.
 */
export const toPublicJob = (job: any) => {
  return {
    _id: String(job._id),
    slug: job.slug || '',
    title: job.title || '',
    department: job.department || undefined,
    location: job.location || '',
    employmentType: job.employmentType || job.type || 'Full Time',
    workplaceType: job.workplaceType || undefined,
    experienceMin: typeof job.experienceMin === 'number' ? job.experienceMin : undefined,
    experienceMax: typeof job.experienceMax === 'number' ? job.experienceMax : undefined,
    educationRequirements: job.educationRequirements || undefined,
    shortDescription: job.shortDescription || undefined,
    coverImage: job.coverImage || undefined,
    description: job.description || undefined,
    responsibilities: Array.isArray(job.responsibilities) ? job.responsibilities : undefined,
    requirements: Array.isArray(job.requirements) ? job.requirements : undefined,
    aiCheckPoints: Array.isArray(job.aiCheckPoints) ? job.aiCheckPoints : undefined,
    eligibilityThreshold: typeof job.eligibilityThreshold === 'number' ? job.eligibilityThreshold : 70,
    partialMatchMin: typeof job.partialMatchMin === 'number' ? job.partialMatchMin : 50,
    showMatchScoreToCandidate: job.showMatchScoreToCandidate !== false,
    showMatchBreakdown: job.showMatchBreakdown !== false,
    featuredJob: Boolean(job.featuredJob),
    applicationClosingDate: job.applicationClosingDate
      ? typeof job.applicationClosingDate === 'string'
        ? job.applicationClosingDate
        : new Date(job.applicationClosingDate).toISOString()
      : undefined,
  };
};

export const getCareers = asyncHandler(async (_req: Request, res: Response) => {
  // Return only open jobs (status active / jobStatus OPEN), newest / featured first
  const careers = await CareerModel.find({
    $and: [
      { status: 'active' },
      { jobStatus: { $ne: 'CLOSED' } },
      { jobStatus: { $ne: 'DRAFT' } },
    ],
  })
    .sort({ featuredJob: -1, createdAt: -1 })
    .lean();

  const publicCareers = careers.map(toPublicJob);
  successResponse(res, publicCareers, 'Careers retrieved');
});

export const getCareerBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(slug);

  const job = await CareerModel.findOne({
    $or: [{ slug }, ...(isObjectId ? [{ _id: slug }] : [])],
  }).lean();

  if (!job) {
    throw new AppError(404, 'Job not found');
  }

  const isOpen = job.status === 'active' && job.jobStatus !== 'CLOSED' && job.jobStatus !== 'DRAFT';
  if (!isOpen) {
    throw new AppError(404, 'Job opening is closed or no longer available');
  }

  successResponse(res, toPublicJob(job), 'Job retrieved');
});

export const createCareer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const cleanData = pick(req.body, CAREER_EDITABLE_FIELDS);
  const career = await CareerModel.create(cleanData);
  successResponse(res, career, 'Career created', 201);
});

export const updateCareer = asyncHandler(async (req: Request, res: Response) => {
  const cleanData = pick(req.body, CAREER_EDITABLE_FIELDS);
  const career = await CareerModel.findByIdAndUpdate(req.params.id, cleanData, { new: true, runValidators: true });
  if (!career) {
    throw new AppError(404, 'Career not found');
  }
  successResponse(res, career, 'Career updated');
});

export const deleteCareer = asyncHandler(async (req: Request, res: Response) => {
  const career = await CareerModel.findByIdAndDelete(req.params.id);
  if (!career) {
    throw new AppError(404, 'Career not found');
  }
  successResponse(res, null, 'Career deleted');
});
