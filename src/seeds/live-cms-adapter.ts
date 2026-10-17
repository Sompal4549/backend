import Page from '../models/page.model';
import Settings from '../models/settings.model';

/**
 * Converts live content to the local CMS layout.
 *
 * Live keeps page content only in ComponentContent; its Page docs carry SEO with short slugs
 * ("about"). Locally the admin edits sections in Settings.data[configKey].sections (mirrored
 * in Page.sections) and the storefront reads those sections first. So live content has to be
 * written into those sections, otherwise the admin and website would show different data.
 */

/** Live page slug -> local configKey */
const LIVE_PAGE_TO_CONFIG_KEY: Record<string, string> = {
  '/': 'landingPage',
  home: 'landingPage',
  about: 'aboutPage',
  'about-us': 'aboutPage',
  turnkey: 'turnkeyPage',
  consultancy: 'consultancyPage',
  products: 'productsPage',
  'projects-and-clients': 'projectsPage',
  projects: 'projectsPage',
  blog: 'blogPage',
  career: 'careersPage',
  careers: 'careersPage',
  contact: 'contactPage',
  enquiry: 'enquiryPage',
  'privacy-policy': 'privacyPolicyPage',
  'terms-and-conditions': 'termsAndConditionsPage',
};

/** Same prefixes as page.routes CONFIG_KEY_TO_PAGE_SLUG */
const CONFIG_KEY_PREFIX: Record<string, string> = {
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

/** Lists the admin edits as `items`, in order of preference */
const ITEM_LIST_FIELDS = ['items', 'cards', 'features', 'ourCoreValues', 'stats'];

const str = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value : undefined;

const firstStr = (data: Record<string, any>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = str(data[key]);
    if (value) return value;
  }
  return undefined;
};

const imageOf = (value: unknown): unknown => {
  if (str(value)) return value;
  if (value && typeof value === 'object' && str((value as any).imageUrl)) return value;
  return undefined;
};

const componentKeyOf = (configKey: string, section: Record<string, any>): string => {
  if (str(section.componentKey)) return section.componentKey;
  const key = String(section.key || '');
  return key.includes('.') ? key : `${CONFIG_KEY_PREFIX[configKey]}.${key}`;
};

/**
 * Rebuilds one admin section from a live ComponentContent record. The record's data is kept
 * whole in section.data; the fields the admin form edits are derived from it.
 */
export const sectionFromComponent = (section: Record<string, any>, component: Record<string, any>) => {
  const data: Record<string, any> = component.data && typeof component.data === 'object' ? component.data : {};
  const itemsField = ITEM_LIST_FIELDS.find((field) => Array.isArray(data[field]));

  const rebuilt: Record<string, any> = {
    key: section.key,
    componentKey: component.key,
    name: section.name || component.label || component.key,
    enabled: component.isActive !== false,
    data,
  };

  const fields: Record<string, unknown> = {
    title: firstStr(data, ['title', 'heading']),
    heading: str(data.heading),
    subtitle: str(data.subtitle),
    description: str(data.description),
    eyebrow: str(data.eyebrow),
    highlight: str(data.highlight),
    buttonLabel: firstStr(data, ['buttonLabel', 'buttonText', 'primaryBtnText', 'primaryButtonText']),
    buttonHref: firstStr(data, ['buttonHref', 'buttonPath', 'primaryBtnPath', 'primaryButtonHref']),
    secondaryButtonLabel: firstStr(data, ['secondaryButtonLabel', 'secondaryBtnText', 'secondaryButtonText']),
    secondaryButtonHref: firstStr(data, ['secondaryButtonHref', 'secondaryBtnPath', 'secondaryButtonPath']),
    image: imageOf(data.image),
    bgImage: imageOf(data.bgImage) || imageOf(data.backgroundImage),
    icon: str(data.icon),
    slides: Array.isArray(data.slides) ? data.slides : undefined,
    items: itemsField ? data[itemsField] : undefined,
    itemsField,
  };
  for (const [name, value] of Object.entries(fields)) {
    if (value !== undefined) rebuilt[name] = value;
  }
  return rebuilt;
};

export interface CmsSyncReport {
  sectionsUpdated: number;
  sectionsKept: string[];
  seoMerged: string[];
  liveOnlyComponents: string[];
}

/** Writes live component content into the admin sections (Settings + Page) and merges live SEO. */
export const syncCmsFromLive = async (snapshot: any): Promise<CmsSyncReport> => {
  const report: CmsSyncReport = { sectionsUpdated: 0, sectionsKept: [], seoMerged: [], liveOnlyComponents: [] };
  const liveByKey = new Map<string, any>(
    (snapshot.componentContents || []).filter((c: any) => c?.key).map((c: any) => [c.key, c])
  );
  const usedKeys = new Set<string>();

  const settingsDoc: any = await Settings.collection.findOne({ website: 'ensis' });
  if (!settingsDoc) throw new Error('Local settings (website: ensis) not found');
  const settingsData: Record<string, any> = settingsDoc.data || {};
  const now = new Date().toISOString();

  for (const configKey of Object.keys(CONFIG_KEY_PREFIX)) {
    const pageConfig = settingsData[configKey];
    const prefix = CONFIG_KEY_PREFIX[configKey];
    const existing: Record<string, any>[] = Array.isArray(pageConfig?.sections) ? pageConfig.sections : [];
    // Sections live renders on this page, in live order (layout.* is the site header/footer)
    const liveOrder: string[] = (snapshot.pageOrder?.[prefix] || []).filter(
      (key: string) => key.startsWith(`${prefix}.`) && liveByKey.has(key)
    );
    if (!pageConfig || (existing.length === 0 && liveOrder.length === 0)) continue;

    const byComponentKey = new Map(existing.map((section) => [componentKeyOf(configKey, section), section]));
    const sections: Record<string, any>[] = [];

    for (const componentKey of liveOrder) {
      const section = byComponentKey.get(componentKey) || { key: componentKey.slice(prefix.length + 1) };
      sections.push(sectionFromComponent(section, liveByKey.get(componentKey)));
      usedKeys.add(componentKey);
      report.sectionsUpdated += 1;
    }
    // Sections not on the live page: live content if the record exists, otherwise kept as they are
    for (const [componentKey, section] of byComponentKey) {
      if (liveOrder.includes(componentKey)) continue;
      const live = liveByKey.get(componentKey);
      if (live) {
        sections.push(sectionFromComponent(section, live));
        usedKeys.add(componentKey);
        report.sectionsUpdated += 1;
      } else {
        sections.push(section);
        report.sectionsKept.push(componentKey);
      }
    }

    const set: Record<string, unknown> = {
      [`data.${configKey}.sections`]: sections,
      [`data.${configKey}.lastUpdated`]: now,
      [`data.${configKey}.updatedBy`]: 'Live import',
    };
    await Settings.collection.updateOne({ _id: settingsDoc._id }, { $set: set });
    await Page.collection.updateOne({ configKey }, { $set: { sections, updatedBy: 'Live import', updatedAt: new Date() } });
  }

  // Live page docs only carry SEO: merge it into the matching local page (never create pages)
  for (const livePage of snapshot.pages || []) {
    const configKey = LIVE_PAGE_TO_CONFIG_KEY[String(livePage?.slug || '').replace(/^\/(?=.)/, '')];
    if (!configKey || !livePage.seo || typeof livePage.seo !== 'object') continue;
    const seo = { ...(settingsData[configKey]?.seo || {}), ...livePage.seo };
    await Settings.collection.updateOne({ _id: settingsDoc._id }, { $set: { [`data.${configKey}.seo`]: seo } });
    await Page.collection.updateOne({ configKey }, { $set: { seo } });
    report.seoMerged.push(configKey);
  }

  report.liveOnlyComponents = [...liveByKey.keys()].filter((key) => !usedKeys.has(key));
  return report;
};
