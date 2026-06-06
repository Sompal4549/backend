import { Request, Response, Router } from 'express';
import { body, param } from 'express-validator';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { adminMiddleware } from '../middlewares/admin.middleware.js';
import Page from "../models/page.model.js";

export const pageRouter = Router();

/**
 * Public Route: Get Page SEO and structure by Slug
 * This is used by the frontend to fetch Meta tags and H1 content
 */
pageRouter.get('/:slug', async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug === 'home' ? '/' : req.params.slug;
    const page = await Page.findOne({ slug });
    if (!page) return res.status(404).json({ success: false, message: "Page not found" });
    res.json({ success: true, data: page });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching page data" });
  }
});

pageRouter.use(authMiddleware, adminMiddleware);

pageRouter.post(
  '/',
  [
    body('pageName').notEmpty().withMessage('Page name is required'),
    body('slug').notEmpty().withMessage('URL Slug is required'),
    // SEO Validations
    body('seo.metaTitle')
      .isLength({ max: 65 })
      .withMessage('Meta Title should not exceed 65 characters'),
    body('seo.metaDescription')
      .isLength({ max: 155 })
      .withMessage('Meta Description should not exceed 155 characters'),
    body('seo.metaKeywords').optional().isString(),
    body('seo.h1').notEmpty().withMessage('One H1 tag per page is required'),
    body('seo.canonical').optional().isString().withMessage('Canonical URL can be manual or auto-generated'),
    body('seo.ogTitle').optional().isString(),
    body('seo.ogDescription').optional().isString(),
    body('seo.ogImage').optional({ values: 'falsy' }).isString(),
    body('seo.schemaMarkup').optional().isString(), // Store JSON-LD as string
    body('seo.breadcrumbs').optional().isArray(),
    body('seo.internalLinks').optional().isString(),
    body('bannerSize').optional().isString().withMessage('Mention banner size (e.g. 1920x600)'),
    body('advanceSeo.headCode').optional().isString(),
    body('advanceSeo.bodyCode').optional().isString(),
    body('robots').optional().isIn(['index, follow', 'noindex, nofollow', 'index, nofollow', 'noindex, follow']),
    // FAQs for Home/Services
    body('faqs').optional().isArray(),
    body('faqs.*.question').notEmpty(),
    body('faqs.*.answer').notEmpty(),
  ],
  validateRequest,
  async (_req: Request, res: Response) => {
    try {
      const newPage = await Page.create(_req.body);
      res.json({ success: true, data: newPage, message: "Page created with SEO controls" });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
  }
);

// Update Page Settings and SEO
pageRouter.put(
  '/:pageId',
  [
    param('pageId').isMongoId(),
    body('pageName').optional().notEmpty(),
    body('slug').optional().notEmpty(),
    body('seo.metaTitle').optional().isLength({ max: 65 }),
    body('seo.metaDescription').optional().isLength({ max: 155 }),
    body('seo.metaKeywords').optional().isString(),
    body('seo.h1').optional().notEmpty(),
    body('seo.canonical').optional().isString(),
    body('seo.ogTitle').optional().isString(),
    body('seo.ogDescription').optional().isString(),
    body('seo.ogImage').optional({ values: 'falsy' }).isString(),
    body('seo.schemaMarkup').optional().isString(),
    body('seo.breadcrumbs').optional().isArray(),
    body('seo.internalLinks').optional().isString(),
    body('bannerSize').optional().isString(),
    body('advanceSeo.headCode').optional().isString(),
    body('advanceSeo.bodyCode').optional().isString(),
    body('robots').optional().isIn(['index, follow', 'noindex, nofollow', 'index, nofollow', 'noindex, follow']),
    body('faqs').optional().isArray(),
    body('faqs.*.question').notEmpty(),
    body('faqs.*.answer').notEmpty(),
  ],
  validateRequest,
  async (_req: Request, res: Response) => {
    try {
      const updatedPage = await Page.findByIdAndUpdate(_req.params.pageId, _req.body, { new: true });
      res.json({ success: true, data: updatedPage, message: "Page settings updated" });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Update components inside a specific page
pageRouter.put(
  '/:pageId/components',
  [
    param('pageId').isMongoId(),
    body('components').isArray(),
    body('components.*.key').notEmpty(),
    body('components.*.data').isObject(),
    body('components.*.imageAlt').optional().isString(), // Editable Alt Text
  ],
  validateRequest,
  async (_req: Request, res: Response) => {
    // TODO: Implement pageService.updatePageComponents(req.params.pageId, _req.body.components)
    res.json({ success: true, message: "Components updated" });
  }
);

// 301 Redirect Management
pageRouter.post(
  '/redirects',
  [
    body('oldUrl').notEmpty(),
    body('newUrl').notEmpty(),
    body('statusCode').optional().isIn([301, 302]).default(301),
  ],
  validateRequest,
  async (_req: Request, res: Response) => {
    // TODO: Implement redirectService.createRedirect(_req.body)
    res.json({ success: true });
  }
);

export default pageRouter;
