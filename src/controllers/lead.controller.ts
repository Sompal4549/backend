import { Request, Response } from "express";
import { LeadModel, ILead } from "../models/lead.model";
import { OrderModel } from "../models/order.model";
import { InvoiceModel } from "../models/invoice.model";
import { asyncHandler } from "../utils/async-handler";
import { AppError } from "../utils/app-error";
import { successResponse } from "../utils/api-response";
import { AuthRequest } from "../middlewares/auth.middleware";

// Fields an admin may set on a lead (never refreshToken / orders)
const EDITABLE_FIELDS: Array<keyof ILead> = [
  "leadImage", "firstName", "lastName", "companyName", "designation", "email", "officialEmail",
  "phone", "phoneCode", "altPhone", "altPhoneCode", "landline", "website", "title", "typeOfBusiness",
  "industrySector", "marketType", "leadType", "leadSource", "leadStatus", "priority", "assignedTo",
  "eventAttribution", "leadDate", "followUpDate", "followUpTime", "followUpMethod", "followUpSource",
  "interestedProduct", "expectedBudget", "estimatedDealValue", "expectedClosingDate", "addressLine",
  "city", "state", "country", "zipCode", "leadNotes", "internalNotes", "leadCategory",
];

const pickEditable = (body: Record<string, unknown>) => {
  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) data[field] = typeof body[field] === "string" ? (body[field] as string).trim() : body[field];
  }
  if (typeof data.email === "string") data.email = data.email.toLowerCase();
  if (typeof data.officialEmail === "string") data.officialEmail = data.officialEmail.toLowerCase();
  return data;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const today = () => new Date().toISOString().slice(0, 10);

const assertUnique = async (data: Record<string, unknown>, exceptId?: string) => {
  const or = [
    ...(data.email ? [{ email: data.email }] : []),
    ...(data.phone ? [{ phone: data.phone }] : []),
  ];
  if (!or.length) return;
  const existing = await LeadModel.findOne({ $or: or, ...(exceptId ? { _id: { $ne: exceptId } } : {}) }).select("firstName lastName").lean();
  if (existing) {
    throw new AppError(409, `A lead with this email or phone already exists (${[existing.firstName, existing.lastName].filter(Boolean).join(" ")})`);
  }
};

export const createLead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = pickEditable(req.body || {});
  await assertUnique(data);
  // Sensible defaults so a quick lead only needs the basics
  const lead = await LeadModel.create({
    officialEmail: data.email,
    title: "Mr./Ms.",
    typeOfBusiness: "Other",
    industrySector: "Wellness",
    eventAttribution: "None",
    leadSource: "Other",
    leadDate: today(),
    followUpDate: today(),
    addressLine: "—",
    city: "—",
    state: "—",
    country: "India",
    ...data,
    assignedTo: data.assignedTo || req.user?.id,
  });
  successResponse(res, lead, "Lead created", 201);
});

export const getLeads = asyncHandler(async (req: Request, res: Response) => {
  const { leadCategory, leadStatus, priority, assignedTo, followUp, search } = req.query as Record<string, string | undefined>;
  const pageNum = Math.max(parseInt((req.query.page as string) || "1", 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt((req.query.limit as string) || "25", 10) || 25, 1), 100);

  const filter: Record<string, unknown> = {};
  if (leadCategory) filter.leadCategory = leadCategory;
  if (leadStatus) filter.leadStatus = leadStatus;
  if (priority) filter.priority = priority;
  if (assignedTo) filter.assignedTo = assignedTo;
  // followUpDate is stored as YYYY-MM-DD, so string comparison orders correctly
  if (followUp === "today") filter.followUpDate = today();
  if (followUp === "overdue") {
    filter.followUpDate = { $lt: today(), $ne: "" };
    filter.leadStatus = { $nin: ["Converted", "Lost"] };
  }

  const term = search?.trim();
  if (term) {
    const regex = new RegExp(escapeRegex(term), "i");
    filter.$or = [
      { firstName: regex },
      { lastName: regex },
      { companyName: regex },
      { email: regex },
      { phone: regex },
      { city: regex },
      { interestedProduct: regex },
    ];
  }

  const open = { leadStatus: { $nin: ["Converted", "Lost"] } };
  const [leads, total, byStatus, byCategory, dueToday, overdue] = await Promise.all([
    LeadModel.find(filter)
      .populate("assignedTo", "name email role")
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    LeadModel.countDocuments(filter),
    LeadModel.aggregate<{ _id: string; count: number }>([{ $group: { _id: { $ifNull: ["$leadStatus", "New"] }, count: { $sum: 1 } } }]),
    LeadModel.aggregate<{ _id: string; count: number }>([{ $group: { _id: { $ifNull: ["$leadCategory", "none"] }, count: { $sum: 1 } } }]),
    LeadModel.countDocuments({ ...open, followUpDate: today() }),
    LeadModel.countDocuments({ ...open, followUpDate: { $lt: today(), $ne: "" } }),
  ]);

  successResponse(
    res,
    {
      leads,
      total,
      page: pageNum,
      limit: limitNum,
      summary: {
        total: byStatus.reduce((sum, s) => sum + s.count, 0),
        byStatus: Object.fromEntries(byStatus.map((s) => [s._id || "New", s.count])),
        byCategory: Object.fromEntries(byCategory.map((c) => [c._id || "none", c.count])),
        followUpsToday: dueToday,
        followUpsOverdue: overdue,
      },
    },
    "Leads retrieved"
  );
});

export const getLead = asyncHandler(async (req: Request, res: Response) => {
  const lead = await LeadModel.findById(req.params.id).populate("assignedTo", "name email role");
  if (!lead) {
    throw new AppError(404, "Lead not found");
  }
  successResponse(res, lead, "Lead retrieved");
});

export const updateLead = asyncHandler(async (req: Request, res: Response) => {
  const data = pickEditable(req.body || {});
  await assertUnique(data, req.params.id);
  const lead = await LeadModel.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true }).populate(
    "assignedTo",
    "name email role"
  );
  if (!lead) {
    throw new AppError(404, "Lead not found");
  }
  successResponse(res, lead, "Lead updated");
});

export const deleteLead = asyncHandler(async (req: Request, res: Response) => {
  // Orders and invoices point at the lead; deleting it would orphan the customer's history
  const [orders, invoices] = await Promise.all([
    OrderModel.countDocuments({ user: req.params.id }),
    InvoiceModel.countDocuments({ lead: req.params.id }),
  ]);
  if (orders || invoices) {
    throw new AppError(
      409,
      `This lead has ${orders} order(s) and ${invoices} invoice(s), so it cannot be deleted. Mark it as Lost instead.`
    );
  }
  const lead = await LeadModel.findByIdAndDelete(req.params.id);
  if (!lead) {
    throw new AppError(404, "Lead not found");
  }
  successResponse(res, null, "Lead deleted");
});
