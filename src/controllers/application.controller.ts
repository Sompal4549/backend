import { Request, Response } from "express";
import applicationModel from "../models/applicationModel";
import { uploadResume } from "../helpers/image.helper";
import { asyncHandler } from "../utils/async-handler";
import { AppError } from "../utils/app-error";
import { successResponse } from "../utils/api-response";

export const createApplication = asyncHandler(async (req: Request, res: Response) => {
  const {
    fullName, email, phone,
    currentLocation, department,
    coverLetter, experience,
  } = req.body;

  // Extra details sent by the AI CV screening flow; plain strings only
  const text = (value: unknown, max = 2000) => (typeof value === "string" ? value.trim().slice(0, max) : "");
  const source = req.body.source === "ai-cv" ? "ai-cv" : "career-form";
  const score = Number(req.body.aiScore);
  const aiDetails = source === "ai-cv"
    ? {
        jobTitle: text(req.body.jobTitle, 200),
        aiSummary: text(req.body.aiSummary),
        linkedin: text(req.body.linkedin, 300),
        currentCompany: text(req.body.currentCompany, 200),
        currentDesignation: text(req.body.currentDesignation, 200),
        noticePeriod: text(req.body.noticePeriod, 100),
        expectedCTC: text(req.body.expectedCTC, 100),
        willingToRelocate: text(req.body.willingToRelocate, 20),
        employmentStatus: text(req.body.employmentStatus, 100),
        ...(Number.isFinite(score) ? { aiScore: Math.max(0, Math.min(100, Math.round(score))) } : {}),
      }
    : {};

  if (!req.file) {
    throw new AppError(400, "Resume is required");
  }

  const { url } = await uploadResume(req.file.buffer, req.file.originalname);

  const application = await applicationModel.create({
    fullName, email, phone,
    currentLocation, department,
    coverLetter, experience,
    resume: url,
    source,
    ...aiDetails,
  });

  successResponse(res, application, "Application created", 201);
});

export const getApplications = asyncHandler(async (_req: Request, res: Response) => {
  const applications = await applicationModel.find().sort({
    createdAt: -1,
  });

  successResponse(res, applications, "Applications retrieved");
});

export const getApplication = asyncHandler(async (req: Request, res: Response) => {
  const application = await applicationModel.findById(
    req.params.id
  );

  if (!application) {
    throw new AppError(404, "Application not found");
  }

  successResponse(res, application, "Application retrieved");
});

const STATUSES = ["pending", "reviewed", "shortlisted", "rejected"];

// Only the HR fields can change; the candidate's own details stay as submitted
export const updateApplication = asyncHandler(async (req: Request, res: Response) => {
  const update: Record<string, string> = {};
  if (req.body.status !== undefined) {
    if (!STATUSES.includes(req.body.status)) throw new AppError(400, "Invalid status");
    update.status = req.body.status;
  }
  if (typeof req.body.notes === "string") update.notes = req.body.notes.slice(0, 5000);

  const application = await applicationModel.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  });
  if (!application) throw new AppError(404, "Application not found");

  successResponse(res, application, "Application updated");
});

export const deleteApplication = asyncHandler(async (req: Request, res: Response) => {
  const application = await applicationModel.findByIdAndDelete(req.params.id);
  if (!application) throw new AppError(404, "Application not found");

  successResponse(res, null, "Application deleted successfully");
});
