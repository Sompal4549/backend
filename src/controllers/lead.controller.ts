import { Request, Response } from "express";
import { LeadModel } from "../models/lead.model";
import { asyncHandler } from "../utils/async-handler";
import { AppError } from "../utils/app-error";

export const createLead = asyncHandler(async (req: Request, res: Response) => {
  const { email, phone } = req.body;

  const existing = await LeadModel.findOne({
    $or: [
      ...(email ? [{ email }] : []),
      ...(phone ? [{ phone }] : []),
    ],
  });

  if (existing) {
    throw new AppError(409, "Lead with this email or phone already exists");
  }

  const lead = await LeadModel.create(req.body);
  res.status(201).json({ status: "success", data: lead });
});

export const getLeads = asyncHandler(async (req: Request, res: Response) => {
  const { leadCategory, search, page = "1", limit = "50" } = req.query;

  const filter: Record<string, unknown> = {};

  if (leadCategory) {
    filter.leadCategory = leadCategory;
  }

  if (search && typeof search === "string") {
    filter.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { companyName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const [leads, total] = await Promise.all([
    LeadModel.find(filter)
      .populate("assignedTo", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    LeadModel.countDocuments(filter),
  ]);

  res.json({ status: "success", data: { leads, total } });
});

export const getLead = asyncHandler(async (req: Request, res: Response) => {
  const lead = await LeadModel.findById(req.params.id).populate("assignedTo", "name email role");
  if (!lead) {
    throw new AppError(404, "Lead not found");
  }
  res.json({ status: "success", data: lead });
});

export const updateLead = asyncHandler(async (req: Request, res: Response) => {
  const lead = await LeadModel.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate(
    "assignedTo",
    "name email role"
  );
  if (!lead) {
    throw new AppError(404, "Lead not found");
  }
  res.json({ status: "success", data: lead });
});

export const deleteLead = asyncHandler(async (req: Request, res: Response) => {
  const lead = await LeadModel.findByIdAndDelete(req.params.id);
  if (!lead) {
    throw new AppError(404, "Lead not found");
  }
  res.json({ status: "success", data: null });
});
