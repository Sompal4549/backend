import { Router } from "express";
import {
  createLead,
  getLeads,
  getLead,
  updateLead,
  deleteLead,
} from "../controllers/lead.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { adminMiddleware } from "../middlewares/admin.middleware";

export const leadRouter = Router();

// Public route - no auth required (for frontend users to submit leads)
leadRouter.post("/public", createLead);

// Admin-only routes
leadRouter.use(authMiddleware, adminMiddleware);

leadRouter.post("/", createLead);
leadRouter.get("/", getLeads);
leadRouter.get("/:id", getLead);
leadRouter.put("/:id", updateLead);
leadRouter.delete("/:id", deleteLead);
