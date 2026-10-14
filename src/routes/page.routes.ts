import { Request, Response, Router } from 'express';
import { body, param } from 'express-validator';
import { validateRequest } from '../middlewares/validate.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { successResponse } from '../utils/api-response';
import Page from "../models/page.model";

export const pageRouter = Router();

/**
 * Public lookup accepts the friendly keys the storefront asks for
 * (generateSeo("about") -> /pages/about) and resolves them to the canonical
 * CMS slug (/about-us) so a single seeded record serves both spellings.
 */
const PAGE_SLUG_ALIASES: Record<string, string> = {
  home: '/',
  about: '/about-us',
  'about-us': '/about-us',
  turnkey: '/turnkey-solutions',
  'turnkey-solutions': '/turnkey-solutions',
  consultancy: '/consultancy',
  solutions: '/custom-solutions',
  'custom-solutions': '/custom-solutions',
  products: '/products',
  projects: '/projects',
  'projects-and-clients': '/projects',
  blog: '/blog',
  career: '/careers',
  careers: '/careers',
  contact: '/contact-us',
  'contact-us': '/contact-us',
  enquiry: '/enquiry',
  'privacy-policy': '/privacy-policy',
  'terms-and-conditions': '/terms-and-conditions',
};

const resolveSlugCandidates = (rawSlug: string): string[] => {
  const slug = decodeURIComponent(rawSlug).replace(/\/+$/, '');
  const trimmed = slug.startsWith('/') ? slug : `/${slug}`;
  const candidates = [rawSlug, slug, trimmed, PAGE_SLUG_ALIASES[slug], PAGE_SLUG_ALIASES[trimmed.replace(/^\//, '')]]
    .filter((value): value is string => Boolean(value));

  return [...new Set(candidates)];
};

pageRouter.get('/:slug', asyncHandler(async (req: Request, res: Response) => {
  const candidates = resolveSlugCandidates(req.params.slug);
  const page = await Page.findOne({ slug: { $in: candidates } });
  if (!page) throw new AppError(404, 'Page not found');
  successResponse(res, page, "Page retrieved");
}));

pageRouter.use(authMiddleware, adminMiddleware);

// Admin console: full page list (all seeded CMS pages).
pageRouter.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const pages = await Page.find().sort({ pageName: 1 }).lean();
  successResponse(res, pages, "Pages retrieved");
}));

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
    successResponse(res, newPage, "Page created with SEO controls", 201);
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
    successResponse(res, updatedPage, "Page settings updated");
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
    successResponse(res, null, "Components updated");
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
    successResponse(res, null, "Redirect created");
  }
);

export default pageRouter;
