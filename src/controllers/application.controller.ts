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

  if (!req.file) {
    throw new AppError(400, "Resume is required");
  }

  const { url } = await uploadResume(req.file.buffer, req.file.originalname);

  const application = await applicationModel.create({
    fullName, email, phone,
    currentLocation, department,
    coverLetter, experience,
    resume: url,
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

export const updateApplication = asyncHandler(async (req: Request, res: Response) => {
  const application = await applicationModel.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
    }
  );

  successResponse(res, application, "Application updated");
});

export const deleteApplication = asyncHandler(async (req: Request, res: Response) => {
  await applicationModel.findByIdAndDelete(req.params.id);

  successResponse(res, null, "Application deleted successfully");
});
