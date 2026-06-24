// routes/seo.routes

import { Router } from "express";
import * as seoController from "../controllers/seo.controller";

const router = Router();

// ⚠️ specific routes PEHLE, dynamic routes baad mein
router.get("/advanced", seoController.getAdvancedSeo);
router.put("/advanced", seoController.upsertAdvancedSeo);

router.post("/", seoController.createSeo);
router.get("/", seoController.getAllSeo);
router.get("/:slug", seoController.getSeoBySlug);
router.put("/:id", seoController.updateSeo);
router.delete("/:id", seoController.deleteSeo);

export default router;