import { Router } from "express";
import {
  createLead,
  getLeads,
  getLead,
  updateLead,
  deleteLead,
} from "../controllers/lead.controller";
import { getLeadsOverview } from "../modules/crm/leads/leads.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { adminMiddleware } from "../middlewares/admin.middleware";

export const leadRouter = Router();

// Admin-only routes
leadRouter.use(authMiddleware, adminMiddleware);

leadRouter.get("/overview", getLeadsOverview);
leadRouter.post("/", createLead);
leadRouter.get("/", getLeads);
leadRouter.get("/:id", getLead);
leadRouter.put("/:id", updateLead);
leadRouter.delete("/:id", deleteLead);
