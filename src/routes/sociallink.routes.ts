import { Router, Request, Response } from "express";
import { SocialClick, SocialLink } from "../models/sociallink.model";
import geoip from "geoip-lite";
import { asyncHandler } from "../utils/async-handler";
import { AppError } from "../utils/app-error";
import { successResponse } from "../utils/api-response";
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';

export const socialRouter = Router();

interface ApiLocation {
  country: string | null;
  city: string | null;
  region: string | null;
  timezone: string | null;
}

interface IpApiResponse {
  status: string;
  country?: string;
  regionName?: string;
  city?: string;
  timezone?: string;
}

async function fetchLocationFromAPI(ip: string): Promise<ApiLocation | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,timezone`, { signal: controller.signal });
    clearTimeout(timeout);
    const data = (await res.json()) as IpApiResponse;
    if (data.status === "success") {
      return {
        country: data.country ?? null,
        city: data.city ?? null,
        region: data.regionName ?? null,
        timezone: data.timezone ?? null,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// SOCIAL LINKS (CRUD)
// ─────────────────────────────────────────────────────────────

/** GET /api/v1/social-clicks/links */
socialRouter.get("/links", asyncHandler(async (_req: Request, res: Response) => {
  const links = await SocialLink.find().sort({ order: 1 });
  return successResponse(res, links, "Links retrieved");
}));

/** POST /api/v1/social-clicks/links */
socialRouter.post("/links", authMiddleware, adminMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { platform, url, icon, isActive, order } = req.body;
  if (!platform || !url) {
    throw new AppError(400, "platform and url are required");
  }

  try {
    const link = await SocialLink.create({ platform, url, icon, isActive, order });
    return successResponse(res, link, "Link created", 201);
  } catch (err: any) {
    if (err.code === 11000) {
      throw new AppError(409, `${err.keyValue?.platform} already exists`);
    }
    throw err;
  }
}));

/** PUT /api/v1/social-clicks/links/:id */
socialRouter.put("/links/:id", authMiddleware, adminMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { platform, url, icon, isActive, order } = req.body;
  const link = await SocialLink.findByIdAndUpdate(
    req.params.id,
    { $set: { platform, url, icon, isActive, order } },
    { new: true, runValidators: true }
  );
  if (!link) throw new AppError(404, "Link not found");
  return successResponse(res, link, "Link updated");
}));

/** DELETE /api/v1/social-clicks/links/:id */
socialRouter.delete("/links/:id", authMiddleware, adminMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const link = await SocialLink.findByIdAndDelete(req.params.id);
  if (!link) throw new AppError(404, "Link not found");
  return successResponse(res, null, "Deleted");
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
  return successResponse(res, stats, "Stats retrieved");
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

  return successResponse(res, { clicks, total, page: Number(page), limit: Number(limit) }, "Clicks retrieved");
}));

/** POST /api/v1/social-clicks */
socialRouter.post("/", asyncHandler(async (req: Request, res: Response) => {
  const { platform } = req.body;

  if (!platform) {
    throw new AppError(400, "platform is required");
  }

  const ip =
    (req.headers["x-client-ip"] as string) ||
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    (req.headers["x-real-ip"] as string) ||
    req.socket.remoteAddress ||
    "unknown";

  const userAgent = req.headers["user-agent"] || "";
  const normalizedPlatform = String(platform).toLowerCase();

  let location: ApiLocation | null = null;

  const geoResult = geoip.lookup(ip);
  if (geoResult) {
    location = {
      country: geoResult.country ?? null,
      city: geoResult.city ?? null,
      region: geoResult.region ?? null,
      timezone: geoResult.timezone ?? null,
    };
  }

  if (!location) {
    location = await fetchLocationFromAPI(ip);
  }

  await SocialClick.create({
    platform: normalizedPlatform,
    ip,
    userAgent,
    country: location?.country ?? null,
    city: location?.city ?? null,
    region: location?.region ?? null,
    timezone: location?.timezone ?? null,
  });

  return successResponse(res, null, "click recorded", 201);
}));
