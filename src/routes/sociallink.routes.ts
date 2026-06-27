import { Router, Request, Response } from "express";
import { SocialClick, SocialLink } from "../models/sociallink.model";
import geoip from "geoip-lite";

export const socialRouter = Router();

// ─────────────────────────────────────────────────────────────
// SOCIAL LINKS (CRUD)
// ─────────────────────────────────────────────────────────────

/** GET /api/v1/social-clicks/links */
socialRouter.get("/links", async (_req: Request, res: Response) => {
  try {
    const links = await SocialLink.find().sort({ order: 1 });
    return res.json({ status: "success", data: links });
  } catch (err) {
    return res.status(500).json({ status: "error", message: "Server error" });
  }
});

/** POST /api/v1/social-clicks/links */
socialRouter.post("/links", async (req: Request, res: Response) => {
  try {
    const { platform, url, icon, isActive, order } = req.body;
    if (!platform || !url) {
      return res.status(400).json({ status: "error", message: "platform and url are required" });
    }
    const link = await SocialLink.create({ platform, url, icon, isActive, order });
    return res.status(201).json({ status: "success", data: link });
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(400).json({ status: "error", message: `${err.keyValue?.platform} already exists` });
    }
    return res.status(500).json({ status: "error", message: "Server error" });
  }
});

/** PUT /api/v1/social-clicks/links/:id */
socialRouter.put("/links/:id", async (req: Request, res: Response) => {
  try {
    const { platform, url, icon, isActive, order } = req.body;
    const link = await SocialLink.findByIdAndUpdate(
      req.params.id,
      { $set: { platform, url, icon, isActive, order } },
      { new: true, runValidators: true }
    );
    if (!link) return res.status(404).json({ status: "error", message: "Link not found" });
    return res.json({ status: "success", data: link });
  } catch (err) {
    return res.status(500).json({ status: "error", message: "Server error" });
  }
});

/** DELETE /api/v1/social-clicks/links/:id */
socialRouter.delete("/links/:id", async (req: Request, res: Response) => {
  try {
    const link = await SocialLink.findByIdAndDelete(req.params.id);
    if (!link) return res.status(404).json({ status: "error", message: "Link not found" });
    return res.json({ status: "success", message: "Deleted" });
  } catch (err) {
    return res.status(500).json({ status: "error", message: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────
// SOCIAL CLICKS (analytics)
// ─────────────────────────────────────────────────────────────

/** GET /api/v1/social-clicks/stats */
socialRouter.get("/stats", async (_req: Request, res: Response) => {
  try {
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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
});

/** GET /api/v1/social-clicks */
socialRouter.get("/", async (req: Request, res: Response) => {
  try {
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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
});

/** POST /api/v1/social-clicks */
socialRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { platform } = req.body;

    if (!platform) {
      return res.status(400).json({ status: "error", message: "platform is required" });
    }

    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      (req.headers["x-real-ip"] as string) ||
      req.socket.remoteAddress ||
      "unknown";

    const userAgent = req.headers["user-agent"] || "";
    const normalizedPlatform = String(platform).toLowerCase();

const location = geoip.lookup(ip);

console.log("IP:", ip);
console.log("Location:", location);

    const doc = await SocialClick.create({
      platform: normalizedPlatform,
      ip,
      userAgent,
      country: location?.country ?? null,
      city: location?.city ?? null,
      region: location?.region ?? null,
      timezone: location?.timezone ?? null,
    });

    console.log("social click saved:", doc._id, normalizedPlatform, ip, location?.country ?? "unknown");

    return res.status(201).json({ status: "success", message: "click recorded" });
  } catch (err) {
    console.error("social-click error:", err);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
});