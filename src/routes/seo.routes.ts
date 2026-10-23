// routes/seo.routes

import { Router } from "express";
import * as seoController from "../controllers/seo.controller";
import * as seoAuditController from "../controllers/seo-audit.controller";
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';

const router = Router();

// ⚠️ specific routes PEHLE, dynamic routes baad mein
router.get("/advanced", seoController.getAdvancedSeo);
router.put("/advanced", authMiddleware, adminMiddleware, seoController.upsertAdvancedSeo);

// Admin audit / AI / competitor / alert actions (static paths before /:slug and /:id)
const admin = [authMiddleware, adminMiddleware];
router.post("/audits", admin, seoAuditController.startAudit);
router.get("/audits/latest", admin, seoAuditController.getLatestAudit);
router.get("/audits/latest/pages", admin, seoAuditController.listLatestAuditPages);
router.get("/audits/latest/pages/:pageId", admin, seoAuditController.getLatestAuditPage);
router.get("/broken-links", admin, seoAuditController.getBrokenLinks);
router.get("/alerts", admin, seoAuditController.listAlerts);
router.post("/recommendations/site", admin, seoAuditController.generateSiteRecommendation);
router.post("/recommendations/pages/:id", admin, seoAuditController.generatePageRecommendation);
router.post("/update", admin, seoAuditController.updatePageSeo);
router.post("/alerts/:id/acknowledge", admin, seoAuditController.acknowledgeAlert);
router.get("/competitors/comparison", admin, seoAuditController.getCompetitorComparison);
router.get("/competitors", admin, seoAuditController.listCompetitors);
router.post("/competitors", admin, seoAuditController.addCompetitor);
router.post("/competitors/:id/audit", admin, seoAuditController.auditCompetitor);
router.delete("/competitors/:id", admin, seoAuditController.deleteCompetitor);

router.post("/", authMiddleware, adminMiddleware, seoController.createSeo);
router.get("/", seoController.getAllSeo);
router.get("/:slug", seoController.getSeoBySlug);
router.put("/:id", authMiddleware, adminMiddleware, seoController.updateSeo);
router.delete("/:id", authMiddleware, adminMiddleware, seoController.deleteSeo);

export default router;