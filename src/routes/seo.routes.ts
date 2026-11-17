// routes/seo.routes

import { Router } from "express";
import multer from "multer";
import * as seoController from "../controllers/seo.controller";
import * as seoAuditController from "../controllers/seo-audit.controller";
import { backlinkController } from "../controllers/backlink.controller";
import { aiContentAuditController } from "../controllers/ai-content-audit.controller";
import { keywordPlannerController } from "../controllers/keyword-planner.controller";
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Optional admin auth for read-only diagnostics (won't fail with 401 if user session is refreshing)
const optionalAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authMiddleware(req, res, () => next());
  }
  return next();
};

// Admin audit / AI / competitor / alert actions (permissive in dev, strict in prod)
const adminAuth = (req: any, res: any, next: any) => {
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authMiddleware(req, res, () => {
      if (req.user && ((req.user as any).role === 'admin' || (req.user as any).role === 'superadmin')) {
        return next();
      }
      return adminMiddleware(req, res, next);
    });
  }
  return authMiddleware(req, res, next);
};

// ⚠️ specific routes PEHLE, dynamic routes baad mein
router.get("/advanced", seoController.getAdvancedSeo);
router.put("/advanced", adminAuth, seoController.upsertAdvancedSeo);

// Backlink Management (Tabs 2 & Excel Tracker)
router.get("/backlinks", backlinkController.getBacklinks);
router.get("/backlinks/export", backlinkController.exportExcel);
router.post("/backlinks/create", adminAuth, backlinkController.createBacklink);
router.post("/backlinks/upload-excel", adminAuth, upload.single("file"), backlinkController.uploadExcel);
router.delete("/backlinks/:id", adminAuth, backlinkController.deleteBacklink);

// AI Content Audit (Tab 3: Plagiarism & ChatGPT copy detection)
router.post("/content-audit", adminAuth, aiContentAuditController.auditContent);

// Keyword Planner (Tab 4: Dual Mode Google Ads + AI Intelligence)
router.post("/keyword-planner", adminAuth, keywordPlannerController.planKeywords);

router.post("/audits", adminAuth, seoAuditController.startAudit);
router.get("/audits/latest", optionalAuth, seoAuditController.getLatestAudit);
router.get("/audits/latest/pages", optionalAuth, seoAuditController.listLatestAuditPages);
router.get("/audits/latest/pages/:pageId", optionalAuth, seoAuditController.getLatestAuditPage);
router.get("/broken-links", optionalAuth, seoAuditController.getBrokenLinks);
router.get("/insights", optionalAuth, seoAuditController.getInsights);
router.get("/alerts", optionalAuth, seoAuditController.listAlerts);
router.post("/recommendations/site", adminAuth, seoAuditController.generateSiteRecommendation);
router.post("/recommendations/pages/:id", adminAuth, seoAuditController.generatePageRecommendation);
router.post("/update", adminAuth, seoAuditController.updatePageSeo);
router.post("/alerts/:id/acknowledge", adminAuth, seoAuditController.acknowledgeAlert);
router.get("/competitors/comparison", optionalAuth, seoAuditController.getCompetitorComparison);
router.get("/competitors", optionalAuth, seoAuditController.listCompetitors);
router.post("/competitors", adminAuth, seoAuditController.addCompetitor);
router.put("/competitors/:id", adminAuth, seoAuditController.updateCompetitor);
router.patch("/competitors/:id", adminAuth, seoAuditController.updateCompetitor);
router.post("/competitors/:id/audit", adminAuth, seoAuditController.auditCompetitor);
router.delete("/competitors/:id", adminAuth, seoAuditController.deleteCompetitor);

router.post("/", adminAuth, seoController.createSeo);
router.get("/", seoController.getAllSeo);
router.get("/:slug", seoController.getSeoBySlug);
router.put("/:id", adminAuth, seoController.updateSeo);
router.delete("/:id", adminAuth, seoController.deleteSeo);

export default router;