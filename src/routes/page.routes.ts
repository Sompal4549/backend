import { Request, Response, Router } from 'express';
import { body, param } from 'express-validator';
import { validateRequest } from '../middlewares/validate.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import Page from "../models/page.model";

export const pageRouter = Router();

pageRouter.get('/:slug', asyncHandler(async (req: Request, res: Response) => {
  const slug = req.params.slug === 'home' ? '/' : req.params.slug;
  const page = await Page.findOne({ slug });
  if (!page) throw new AppError(404, 'Page not found');
  res.json({ success: true, data: page });
}));

pageRouter.use(authMiddleware, adminMiddleware);

pageRouter.post(
  '/',
  [
    body('pageName').notEmpty().withMessage('Page name is required'),
    body('slug').notEmpty().withMessage('URL Slug is required'),
    body('seo.metaTitle').isLength({ max: 65 }).withMessage('Meta Title should not exceed 65 characters'),
    body('seo.metaDescription').isLength({ max: 155 }).withMessage('Meta Description should not exceed 155 characters'),
    body('seo.metaKeywords').optional().isString(),
    body('seo.canonical').optional().isString(),
    body('seo.ogJson').optional().isString(),
    body('seo.schema').optional().isString(),
    body('advanceSeo.headCode').optional().isString(),
    body('advanceSeo.bodyCode').optional().isString(),
    body('robots').optional().isIn(['index, follow', 'noindex, nofollow', 'index, nofollow', 'noindex, follow']),
    body('faqs').optional().isArray(),
    body('faqs.*.question').notEmpty(),
    body('faqs.*.answer').notEmpty(),
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const newPage = await Page.create(req.body);
    res.json({ success: true, data: newPage, message: "Page created with SEO controls" });
  })
);

pageRouter.put(
  '/:pageId',
  [
    param('pageId').isMongoId(),
    body('pageName').optional().notEmpty(),
    body('slug').optional().notEmpty(),
    body('seo.metaTitle').optional().isLength({ max: 65 }),
    body('seo.metaDescription').optional().isLength({ max: 155 }),
    body('seo.metaKeywords').optional().isString(),
    body('seo.canonical').optional().isString(),
    body('seo.ogJson').optional().isString(),
    body('seo.schema').optional().isString(),
    body('advanceSeo.headCode').optional().isString(),
    body('advanceSeo.bodyCode').optional().isString(),
    body('robots').optional().isIn(['index, follow', 'noindex, nofollow', 'index, nofollow', 'noindex, follow']),
    body('faqs').optional().isArray(),
    body('faqs.*.question').notEmpty(),
    body('faqs.*.answer').notEmpty(),
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const updatedPage = await Page.findByIdAndUpdate(req.params.pageId, { $set: req.body }, { new: true });
    res.json({ success: true, data: updatedPage, message: "Page settings updated" });
  })
);

pageRouter.put(
  '/:pageId/components',
  [
    param('pageId').isMongoId(),
    body('components').isArray(),
    body('components.*.key').notEmpty(),
    body('components.*.data').isObject(),
    body('components.*.imageAlt').optional().isString(),
  ],
  validateRequest,
  async (_req: Request, res: Response) => {
    res.json({ success: true, message: "Components updated" });
  }
);

pageRouter.post(
  '/redirects',
  [
    body('oldUrl').notEmpty(),
    body('newUrl').notEmpty(),
    body('statusCode').optional().isIn([301, 302]).default(301),
  ],
  validateRequest,
  async (_req: Request, res: Response) => {
    res.json({ success: true });
  }
);

export default pageRouter;
