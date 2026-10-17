import { Request, Response } from 'express';
import { successResponse } from '../utils/api-response';
import { mapItemsToAliases, preserveImageShapes } from '../utils/cms-items';
import { asyncHandler } from '../utils/async-handler';
import { ComponentContentModel } from '../models/component-content.model';
import {
  deleteComponentContent,
  deleteHomeComponentContent,
  getComponentContentByKey,
  getHomeComponentContentByKey,
  listHomeComponentContent,
  listComponentContent,
  saveHomeComponentContent,
  updateComponentContent,
  updateHomeComponentContent,
  upsertComponentContent,
} from '../services/component-content.service';

export const getComponentContents = asyncHandler(async (req: Request, res: Response) => {
  const contents = await listComponentContent(req.query);
  successResponse(res, contents, 'Component contents retrieved');
});

import Page from '../models/page.model';
import Settings from '../models/settings.model';

const PAGE_TO_CONFIG_KEY: Record<string, string> = {
  home: 'landingPage',
  landing: 'landingPage',
  about: 'aboutPage',
  'about-us': 'aboutPage',
  turnkey: 'turnkeyPage',
  'turnkey-solutions': 'turnkeyPage',
  consultancy: 'consultancyPage',
  solutions: 'solutionsPage',
  'custom-solutions': 'solutionsPage',
  products: 'productsPage',
  product: 'productsPage',
  projects: 'projectsPage',
  'projects-and-clients': 'projectsPage',
  blog: 'blogPage',
  blogs: 'blogPage',
  career: 'careersPage',
  careers: 'careersPage',
  contact: 'contactPage',
  'contact-us': 'contactPage',
  enquiry: 'enquiryPage',
  policy: 'privacyPolicyPage',
  privacy: 'privacyPolicyPage',
  'privacy-policy': 'privacyPolicyPage',
  terms: 'termsAndConditionsPage',
  'terms-and-conditions': 'termsAndConditionsPage',
};

export const getComponentsByPage = asyncHandler(async (req: Request, res: Response) => {
  const { page } = req.params;
  const { includeInactive } = req.query;

  const configKey = PAGE_TO_CONFIG_KEY[page] || page;

  // 1. Try to read sections from Page model or Settings
  try {
    const cmsPage: any = await Page.findOne({
      $or: [{ configKey }, { slug: page }, { slug: `/${page}` }],
    }).lean();

    let sections: any[] | undefined = cmsPage?.sections;

    if (!sections || !Array.isArray(sections) || sections.length === 0) {
      const settingsDoc: any = await Settings.findOne({ website: 'ensis' }).lean();
      sections = settingsDoc?.data?.[configKey]?.sections;
    }

    if (sections && Array.isArray(sections) && sections.length > 0) {
      const activeSections = includeInactive === 'true'
        ? sections
        : sections.filter((s: any) => s.enabled !== false && s.isActive !== false);

      const formatted = activeSections.map((section: any, idx: number) => {
        let key = section.key || section.componentKey || `sec_${idx}`;
        if (!key.includes('.')) {
          key = `${page}.${key}`;
        }

        const mergedData: Record<string, any> = {
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
          ...mapItemsToAliases(section.items, section.data || {}, section.itemsField),
          // The admin slide editor edits section.slides; the storefront hero reads data.slides
          ...(Array.isArray(section.slides) ? { slides: section.slides } : {}),
        };
        preserveImageShapes(mergedData, section.data || {});

        return {
          _id: section._id || section.id || `${page}_${key}_${idx}`,
          key,
          componentKey: key,
          label: section.name || section.title || key,
          page,
          index: idx + 1,
          isActive: section.enabled !== false && section.isActive !== false,
          data: mergedData,
        };
      });

      return successResponse(res, formatted, `Components for page: ${page} retrieved from CMS`);
    }
  } catch (err) {
    console.warn(`[getComponentsByPage] Error reading CMS sections for "${page}":`, err);
  }

  // 2. Fallback to ComponentContent collection
  const filter: any = { page };
  if (includeInactive !== 'true') {
    filter.isActive = true;
  }

  const contents = await ComponentContentModel.find(filter).sort({ index: 1 }).lean();
  successResponse(res, contents, `Components for page: ${page} retrieved`);
});

export const getComponentContent = asyncHandler(async (req: Request, res: Response) => {
  const content = await getComponentContentByKey(req.params.key);
  successResponse(res, content, 'Component content retrieved');
});

export const saveComponentContent = asyncHandler(async (req: Request, res: Response) => {
  const content = await upsertComponentContent(req.body);
  successResponse(res, content, 'Component content saved', 201);
});

export const editComponentContent = asyncHandler(async (req: Request, res: Response) => {
  const content = await updateComponentContent(req.params.id, req.body);
  successResponse(res, content, 'Component content updated');
});

export const removeComponentContent = asyncHandler(async (req: Request, res: Response) => {
  await deleteComponentContent(req.params.id);
  successResponse(res, null, 'Component content deleted');
});

export const getHomeComponentContents = asyncHandler(async (req: Request, res: Response) => {
  const contents = await listHomeComponentContent(req.query);
  successResponse(res, contents, 'Home component contents retrieved');
});

export const getHomeComponentContent = asyncHandler(async (req: Request, res: Response) => {
  const content = await getHomeComponentContentByKey(req.params.key);
  successResponse(res, content, 'Home component content retrieved');
});

export const saveHomeComponent = asyncHandler(async (req: Request, res: Response) => {
  const content = await saveHomeComponentContent(req.body);
  successResponse(res, content, 'Home component content saved', 201);
});

export const editHomeComponent = asyncHandler(async (req: Request, res: Response) => {
  const content = await updateHomeComponentContent(req.params.id, req.body);
  successResponse(res, content, 'Home component content updated');
});

export const removeHomeComponent = asyncHandler(async (req: Request, res: Response) => {
  await deleteHomeComponentContent(req.params.id);
  successResponse(res, null, 'Home component content deleted');
});
