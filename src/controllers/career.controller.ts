import { Request, Response } from 'express';
import { CareerModel } from '../models/career.model';
import { AuthRequest } from '../middlewares/auth.middleware';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { pick } from '../utils/pick';

const CAREER_EDITABLE_FIELDS = [
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
] as const;

export const getCareers = asyncHandler(async (_req: Request, res: Response) => {
  // The website lists open jobs only (drafts and closed jobs stay in the admin)
  const careers = await CareerModel.find({ status: 'active' }).sort({ featuredJob: -1, createdAt: -1 }).lean();
  successResponse(res, careers, 'Careers retrieved');
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
