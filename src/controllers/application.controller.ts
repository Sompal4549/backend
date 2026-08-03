import { Request, Response } from "express";
import applicationModel from "../models/applicationModel";
import { uploadResume } from "../helpers/image.helper";
import { asyncHandler } from "../utils/async-handler";
import { AppError } from "../utils/app-error";

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

  res.status(201).json({ success: true, data: application });
});

export const getApplications = asyncHandler(async (_req: Request, res: Response) => {
  const applications = await applicationModel.find().sort({
    createdAt: -1,
  });

  res.json({
    success: true,
    data: applications,
  });
});

export const getApplication = asyncHandler(async (req: Request, res: Response) => {
  const application = await applicationModel.findById(
    req.params.id
  );

  if (!application) {
    throw new AppError(404, "Application not found");
  }

  res.json({
    success: true,
    data: application,
  });
});

export const updateApplication = asyncHandler(async (req: Request, res: Response) => {
  const application = await applicationModel.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
    }
  );

  res.json({
    success: true,
    data: application,
  });
});

export const deleteApplication = asyncHandler(async (req: Request, res: Response) => {
  await applicationModel.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: "Application deleted successfully",
  });
});
