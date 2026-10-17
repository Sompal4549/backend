// routes/seo.routes

import { Router } from "express";
import * as seoController from "../controllers/seo.controller";
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';

const router = Router();

// ⚠️ specific routes PEHLE, dynamic routes baad mein
router.get("/advanced", seoController.getAdvancedSeo);
router.put("/advanced", authMiddleware, adminMiddleware, seoController.upsertAdvancedSeo);

router.post("/", authMiddleware, adminMiddleware, seoController.createSeo);
router.get("/", seoController.getAllSeo);
router.get("/:slug", seoController.getSeoBySlug);
router.put("/:id", authMiddleware, adminMiddleware, seoController.updateSeo);
router.delete("/:id", authMiddleware, adminMiddleware, seoController.deleteSeo);

export default router;