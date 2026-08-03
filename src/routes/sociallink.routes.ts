import { Router, Request, Response } from "express";
import { SocialClick, SocialLink } from "../models/sociallink.model";
import geoip from "geoip-lite";
import { asyncHandler } from "../utils/async-handler";
import { AppError } from "../utils/app-error";

export const socialRouter = Router();

// ─────────────────────────────────────────────────────────────
// SOCIAL LINKS (CRUD)
// ─────────────────────────────────────────────────────────────

/** GET /api/v1/social-clicks/links */
socialRouter.get("/links", asyncHandler(async (_req: Request, res: Response) => {
  const links = await SocialLink.find().sort({ order: 1 });
  return res.json({ status: "success", data: links });
}));

/** POST /api/v1/social-clicks/links */
socialRouter.post("/links", asyncHandler(async (req: Request, res: Response) => {
  const { platform, url, icon, isActive, order } = req.body;
  if (!platform || !url) {
    throw new AppError(400, "platform and url are required");
  }

  try {
    const link = await SocialLink.create({ platform, url, icon, isActive, order });
    return res.status(201).json({ status: "success", data: link });
  } catch (err: any) {
    if (err.code === 11000) {
      throw new AppError(409, `${err.keyValue?.platform} already exists`);
    }
    throw err;
  }
}));

/** PUT /api/v1/social-clicks/links/:id */
socialRouter.put("/links/:id", asyncHandler(async (req: Request, res: Response) => {
  const { platform, url, icon, isActive, order } = req.body;
  const link = await SocialLink.findByIdAndUpdate(
    req.params.id,
    { $set: { platform, url, icon, isActive, order } },
    { new: true, runValidators: true }
  );
  if (!link) throw new AppError(404, "Link not found");
  return res.json({ status: "success", data: link });
}));

/** DELETE /api/v1/social-clicks/links/:id */
socialRouter.delete("/links/:id", asyncHandler(async (req: Request, res: Response) => {
  const link = await SocialLink.findByIdAndDelete(req.params.id);
  if (!link) throw new AppError(404, "Link not found");
  return res.json({ status: "success", message: "Deleted" });
}));

// ─────────────────────────────────────────────────────────────
// SOCIAL CLICKS (analytics)
// ─────────────────────────────────────────────────────────────

/** GET /api/v1/social-clicks/stats */
socialRouter.get("/stats", asyncHandler(async (_req: Request, res: Response) => {
  const stats = await SocialClick.aggregate([
    {
      $group: {
        _id: { $toLower: "$platform" },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);
  return res.json({ status: "success", data: stats });
}));

/** GET /api/v1/social-clicks */
socialRouter.get("/", asyncHandler(async (req: Request, res: Response) => {
  const { platform, page = 1, limit = 50 } = req.query;

  const filter: any = {};
  if (platform) filter.platform = String(platform).toLowerCase();

  const total = await SocialClick.countDocuments(filter);
  const clicks = await SocialClick.find(filter)
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  return res.json({
    status: "success",
    data: { clicks, total, page: Number(page), limit: Number(limit) },
  });
}));

/** POST /api/v1/social-clicks */
socialRouter.post("/", asyncHandler(async (req: Request, res: Response) => {
  const { platform } = req.body;

  if (!platform) {
    throw new AppError(400, "platform is required");
  }

  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    (req.headers["x-real-ip"] as string) ||
    req.socket.remoteAddress ||
    "unknown";

  const userAgent = req.headers["user-agent"] || "";
  const normalizedPlatform = String(platform).toLowerCase();

  const location = geoip.lookup(ip);

  await SocialClick.create({
    platform: normalizedPlatform,
    ip,
    userAgent,
    country: location?.country ?? null,
    city: location?.city ?? null,
    region: location?.region ?? null,
    timezone: location?.timezone ?? null,
  });

  return res.status(201).json({ status: "success", message: "click recorded" });
}));
