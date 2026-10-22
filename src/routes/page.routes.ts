import { Request, Response, Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middlewares/validate.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { successResponse } from '../utils/api-response';
import Page from '../models/page.model';
import Settings from '../models/settings.model';
import { ComponentContentModel } from '../models/component-content.model';
import { mapItemsToAliases, preserveImageShapes } from '../utils/cms-items';
import { isObjectIdString } from '../utils/object-id';
import { escapeRegex } from '../utils/escape-regex';
import { pick } from '../utils/pick';

const PAGE_EDITABLE_FIELDS = [
  'configKey', 'pageName', 'title', 'slug', 'status', 'visibility',
  'author', 'updatedBy', 'sections', 'seo', 'scripts',
] as const;

const CONFIG_KEY_TO_PAGE_SLUG: Record<string, string> = {
  landingPage: 'home',
  aboutPage: 'about',
  turnkeyPage: 'turnkey',
  consultancyPage: 'consultancy',
  solutionsPage: 'solutions',
  productsPage: 'product',
  projectsPage: 'projects',
  blogPage: 'blog',
  careersPage: 'career',
  contactPage: 'contact',
  enquiryPage: 'enquiry',
  privacyPolicyPage: 'policy',
  termsAndConditionsPage: 'policy',
};

export const pageRouter = Router();

/**
 * Public lookup accepts friendly keys and resolves them to canonical CMS records.
 */
const PAGE_SLUG_ALIASES: Record<string, string> = {
  home: '/',
  about: '/about-us',
  'about-us': '/about-us',
  turnkey: '/turnkey',
  'turnkey-solutions': '/turnkey',
  consultancy: '/consultancy',
  solutions: '/solutions',
  'custom-solutions': '/solutions',
  products: '/products',
  projects: '/projects-and-clients',
  'projects-and-clients': '/projects-and-clients',
  blog: '/blog',
  career: '/career',
  careers: '/career',
  contact: '/contact',
  'contact-us': '/contact',
  enquiry: '/enquiry',
  'privacy-policy': '/privacy-policy',
  'terms-and-conditions': '/terms-and-conditions',
};

const resolveSlugCandidates = (rawSlug: string): string[] => {
  const slug = decodeURIComponent(rawSlug).replace(/\/+$/, '');
  const trimmed = slug.startsWith('/') ? slug : `/${slug}`;
  const candidates = [
    rawSlug,
    slug,
    trimmed,
    PAGE_SLUG_ALIASES[slug],
    PAGE_SLUG_ALIASES[trimmed.replace(/^\//, '')],
    PAGE_SLUG_ALIASES[rawSlug],
  ].filter((value): value is string => Boolean(value));

  return [...new Set(candidates)];
};

pageRouter.get('/:slug', asyncHandler(async (req: Request, res: Response) => {
  const candidates = resolveSlugCandidates(req.params.slug);
  const page = await Page.findOne({
    $or: [
      { slug: { $in: candidates } },
      { configKey: req.params.slug },
      { pageName: new RegExp('^' + escapeRegex(req.params.slug) + '$', 'i') },
    ],
  });
  if (!page) throw new AppError(404, 'Page not found');
  successResponse(res, page, "Page retrieved");
}));

// Full page list (all seeded CMS pages) - accessible for both storefront and admin
pageRouter.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const pages = await Page.find().sort({ pageName: 1 }).lean();
  successResponse(res, pages, "Pages retrieved");
}));

pageRouter.use(authMiddleware, adminMiddleware);

pageRouter.post(
  '/',
  [
    body('pageName').optional().notEmpty().withMessage('Page name is required'),
    body('slug').optional().notEmpty().withMessage('URL Slug is required'),
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const payload = {
      ...req.body,
      pageName: req.body.pageName || req.body.title || 'Untitled Page',
      slug: req.body.slug || '/' + (req.body.pageName || 'page').toLowerCase().replace(/\s+/g, '-'),
    };
    const newPage = await Page.create(payload);
    successResponse(res, newPage, "Page created with SEO controls", 201);
  })
);

pageRouter.put(
  '/:pageId',
  asyncHandler(async (req: Request, res: Response) => {
    const rawKey = req.params.pageId;
    const isMongoId = isObjectIdString(rawKey);

    const query = isMongoId
      ? { _id: rawKey }
      : {
          $or: [
            { configKey: rawKey },
            { slug: rawKey },
            { slug: rawKey.startsWith('/') ? rawKey : `/${rawKey}` },
            { pageName: new RegExp(`^${rawKey.replace(/[-_]/g, ' ')}$`, 'i') },
          ],
        };

    const cleanPayload = pick(req.body, PAGE_EDITABLE_FIELDS);
    if (cleanPayload.title && !cleanPayload.pageName) {
      cleanPayload.pageName = cleanPayload.title;
    }
    delete cleanPayload.title;

    const updatePayload: Record<string, any> = {
      ...cleanPayload,
      updatedAt: new Date(),
    };

    let updatedPage = await Page.findOneAndUpdate(query, { $set: updatePayload }, { new: true });

    if (!updatedPage) {
      // Upsert if not found
      const configKey = cleanPayload.configKey || rawKey;
      updatedPage = await Page.create({
        configKey,
        pageName: cleanPayload.pageName || rawKey,
        slug: cleanPayload.slug || (rawKey.startsWith('/') ? rawKey : `/${rawKey}`),
        status: cleanPayload.status || 'Published',
        visibility: cleanPayload.visibility || 'Public',
        author: cleanPayload.author || 'Admin',
        updatedBy: cleanPayload.updatedBy || 'Admin',
        sections: cleanPayload.sections || [],
        seo: cleanPayload.seo || {},
        ...cleanPayload,
      });
    }

    // Also sync to Settings collection under website: 'ensis'
    try {
      const configKey = updatedPage.configKey || req.body.configKey || rawKey;
      if (configKey) {
        const pageSettingsData = {
          title: updatedPage.pageName,
          slug: updatedPage.slug,
          status: updatedPage.status || 'Published',
          visibility: updatedPage.visibility || 'Public',
          author: updatedPage.author || 'Admin',
          updatedBy: updatedPage.updatedBy || 'Admin',
          lastUpdated: new Date().toISOString(),
          seo: updatedPage.seo,
          sections: updatedPage.sections,
        };

        await Settings.findOneAndUpdate(
          { website: 'ensis' },
          {
            $set: {
              [`data.${configKey}`]: pageSettingsData,
            },
          },
          { upsert: true, new: true }
        );

        // Also sync/upsert to ComponentContent collection for full backwards and storefront synchronization
        if (Array.isArray(updatedPage.sections)) {
          const pageSlug = CONFIG_KEY_TO_PAGE_SLUG[configKey] || configKey.replace(/Page$/, '').toLowerCase();
          for (let idx = 0; idx < updatedPage.sections.length; idx++) {
            const section = updatedPage.sections[idx];
            // componentKey names the storefront record (e.g. privacy-content -> policy.privacy)
            let compKey = section.componentKey || section.key;
            if (!compKey) continue;
            if (!compKey.includes('.')) {
              compKey = `${pageSlug}.${compKey}`;
            }

            const existingComp = await ComponentContentModel.findOne({ key: compKey });

            const mergedData: Record<string, any> = {
              ...(existingComp?.data || {}),
              ...(section.data || {}),
              ...(section.title ? { title: section.title } : {}),
              ...(section.heading ? { heading: section.heading } : (section.title ? { heading: section.title } : {})),
              ...(section.subtitle ? { subtitle: section.subtitle } : {}),
              ...(section.description ? { description: section.description } : {}),
              ...(section.eyebrow ? { eyebrow: section.eyebrow, highlight: section.eyebrow } : {}),
              ...(section.highlight ? { highlight: section.highlight } : {}),
              ...(section.buttonLabel ? {
                buttonLabel: section.buttonLabel,
                buttonText: section.buttonLabel,
                primaryBtnText: section.buttonLabel,
                primaryButtonText: section.buttonLabel,
              } : {}),
              ...(section.buttonHref ? {
                buttonHref: section.buttonHref,
                buttonPath: section.buttonHref,
                primaryBtnPath: section.buttonHref,
                primaryButtonHref: section.buttonHref,
              } : {}),
              ...(section.secondaryButtonLabel ? {
                secondaryButtonLabel: section.secondaryButtonLabel,
                secondaryBtnText: section.secondaryButtonLabel,
                secondaryButtonText: section.secondaryButtonLabel,
              } : {}),
              ...(section.secondaryButtonHref ? {
                secondaryButtonHref: section.secondaryButtonHref,
                secondaryBtnPath: section.secondaryButtonHref,
                secondaryButtonPath: section.secondaryButtonHref,
              } : {}),
              ...(section.image ? {
                image: typeof section.image === 'string' ? { imageUrl: section.image, alt: section.title || '' } : section.image,
                imageUrl: typeof section.image === 'string' ? section.image : section.image?.imageUrl,
                imageurl: typeof section.image === 'string' ? { imageUrl: section.image, alt: section.title || '' } : section.image,
                imageSrc: typeof section.image === 'string' ? section.image : section.image?.imageUrl,
              } : {}),
              ...(section.bgImage || section.backgroundImage ? {
                bgImage: section.bgImage || section.backgroundImage,
                backgroundImage: typeof (section.bgImage || section.backgroundImage) === 'string'
                  ? { imageUrl: section.bgImage || section.backgroundImage, alt: 'Background' }
                  : (section.bgImage || section.backgroundImage),
              } : {}),
              ...(section.icon ? {
                icon: section.icon,
                iconSrc: section.icon,
                iconImage: section.icon,
              } : {}),
              ...mapItemsToAliases(section.items, { ...(existingComp?.data || {}), ...(section.data || {}) }, section.itemsField),
              // The admin slide editor edits section.slides; the storefront hero reads data.slides
              ...(Array.isArray(section.slides) ? { slides: section.slides } : {}),
            };
            preserveImageShapes(mergedData, { ...(existingComp?.data || {}), ...(section.data || {}) });

            // Policy pages render data.sections ({ id, number, title, text }); the admin edits items ({ title, description })
            if (compKey.startsWith('policy.') && Array.isArray(section.items) && section.items.length) {
              const previous: any[] = Array.isArray(existingComp?.data?.sections) ? existingComp.data.sections : [];
              mergedData.sections = section.items.map((item: any, i: number) => {
                const title = String(item?.title || '').replace(/^\s*\d+[.)]\s*/, '');
                return {
                  ...(previous[i] || {}),
                  id: previous[i]?.id || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `section-${i + 1}`,
                  number: String(i + 1).padStart(2, '0'),
                  title,
                  text: item?.description || '',
                };
              });
            }

            await ComponentContentModel.findOneAndUpdate(
              { key: compKey },
              {
                $set: {
                  key: compKey,
                  label: section.name || section.title || compKey,
                  page: pageSlug,
                  index: idx + 1,
                  isActive: section.enabled !== false,
                  data: mergedData,
                },
              },
              { upsert: true, new: true }
            );
          }
        }
      }
    } catch (syncErr) {
      console.warn('Failed to sync page to Settings / ComponentContent document:', syncErr);
    }

    successResponse(res, updatedPage, "Page settings updated");
  })
);

pageRouter.put(
  '/:pageId/components',
  asyncHandler(async (_req: Request, res: Response) => {
    successResponse(res, null, "Components updated");
  })
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
