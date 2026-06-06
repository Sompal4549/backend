// routes/seo.routes

import { Router } from "express";
import * as seoController from "../controllers/seo.controller";

const router = Router();

router.post("/", seoController.createSeo);

router.get("/", seoController.getAllSeo);

router.get("/:slug", seoController.getSeoBySlug);

router.put("/:id", seoController.updateSeo);

router.delete("/:id", seoController.deleteSeo);

export default router;