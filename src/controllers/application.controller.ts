import { Request, Response } from "express";
import applicationModel from "../models/applicationModel";
import { uploadResume } from "../helpers/image.helper";

export const createApplication = async (req: Request, res: Response) => {
  try {
    const {
      fullName, email, phone,
      currentLocation, department,
      coverLetter, experience,
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Resume is required" });
    }

    const { url } = await uploadResume(req.file.buffer, req.file.originalname);

    const application = await applicationModel.create({
      fullName, email, phone,
      currentLocation, department,
      coverLetter, experience,
      resume: url,
    });

    res.status(201).json({ success: true, data: application });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
export const getApplications = async (
  res: Response
) => {
  const applications = await applicationModel.find().sort({
    createdAt: -1,
  });

  res.json({
    success: true,
    data: applications,
  });
};

export const getApplication = async (
  req: Request,
  res: Response
) => {
  const application = await applicationModel.findById(
    req.params.id
  );

  if (!application) {
    return res.status(404).json({
      success: false,
      message: "Application not found",
    });
  }

  res.json({
    success: true,
    data: application,
  });
};

export const updateApplication = async (
  req: Request,
  res: Response
) => {
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
};

export const deleteApplication = async (
  req: Request,
  res: Response
) => {
  await applicationModel.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: "Application deleted successfully",
  });
};