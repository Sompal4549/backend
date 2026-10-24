/**
 * Fills the admin's Pages & CMS from the content that is already live.
 *
 * The admin editors read `Settings.data.<configKey>` (sections + SEO), while the website reads the
 * `ComponentContent` collection. On a database where only the website content exists, the admin shows
 * code defaults instead of the live content, and saving would put those defaults over the live site.
 * This script rebuilds the admin's records FROM the live content so the admin shows what the site shows.
 *
 *   npm run backfill:cms                     dry run: prints what it would do, writes nothing
 *   npm run backfill:cms -- --apply          writes
 *   npm run backfill:cms -- --apply --only=landingPage,aboutPage
 *   npm run backfill:cms -- --apply --force  also rebuild pages that already have saved sections
 *
 * What it writes (and nothing else):
 *   - Settings.data.<configKey>  for pages whose config has no sections yet (or all, with --force)
 *   - Page.configKey             on existing Page documents that lack it (so the admin's save finds them
 *                                instead of creating a duplicate page)
 * What it never touches: ComponentContent, Page.sections, Page.seo. The website does not change.
 */
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.config';
import { ComponentContentModel } from '../models/component-content.model';
import Page from '../models/page.model';
import Settings from '../models/settings.model';

type PageDef = {
  configKey: string;
  pageName: string;
  /** ComponentContent.page value (also the key prefix) */
  prefix: string;
  /** Exact component keys, when a prefix is shared (privacy / terms both live under "policy") */
  keys?: string[];
  /** Slugs an existing Page document may have, with or without the leading slash */
  slugs: string[];
};

// Same configKey -> page mapping as page.routes.ts (CONFIG_KEY_TO_PAGE_SLUG) and the admin's cmsPages
export const PAGES: PageDef[] = [
  { configKey: 'landingPage', pageName: 'Home', prefix: 'home', slugs: ['/', 'home'] },
  { configKey: 'aboutPage', pageName: 'About', prefix: 'about', slugs: ['/about-us', 'about-us', '/about', 'about'] },
  { configKey: 'turnkeyPage', pageName: 'Turnkey', prefix: 'turnkey', slugs: ['/turnkey', 'turnkey', '/turnkey-solutions', 'turnkey-solutions'] },
  { configKey: 'consultancyPage', pageName: 'Consultancy', prefix: 'consultancy', slugs: ['/consultancy', 'consultancy'] },
  { configKey: 'productsPage', pageName: 'Products', prefix: 'product', slugs: ['/products', 'products'] },
  { configKey: 'projectsPage', pageName: 'Projects', prefix: 'projects', slugs: ['/projects-and-clients', 'projects-and-clients', '/projects', 'projects'] },
  { configKey: 'blogPage', pageName: 'Blog', prefix: 'blog', slugs: ['/blog', 'blog'] },
  { configKey: 'careersPage', pageName: 'Career', prefix: 'career', slugs: ['/career', 'career', '/careers', 'careers'] },
  { configKey: 'contactPage', pageName: 'Contact', prefix: 'contact', slugs: ['/contact', 'contact', '/contact-us', 'contact-us'] },
  { configKey: 'enquiryPage', pageName: 'Enquiry', prefix: 'enquiry', slugs: ['/enquiry', 'enquiry'] },
  { configKey: 'privacyPolicyPage', pageName: 'Privacy Policy', prefix: 'policy', keys: ['policy.privacy'], slugs: ['/privacy-policy', 'privacy-policy'] },
  { configKey: 'termsAndConditionsPage', pageName: 'Terms & Conditions', prefix: 'policy', keys: ['policy.terms'], slugs: ['/terms-and-conditions', 'terms-and-conditions'] },
];

type Rec = Record<string, any>;

/** The lists the backend's mapItemsToAliases writes (utils/cms-items.ts): the only ones the admin's "items" editor can reach */
const ITEM_LISTS = ['items', 'ourCoreValues', 'stats', 'features', 'cards'] as const;

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const first = (...values: unknown[]): string =>
  (values.find((v) => typeof v === 'string' && v.trim() !== '') as string | undefined) ?? '';
const urlOf = (value: unknown): string =>
  typeof value === 'string' ? value : value && typeof value === 'object' && typeof (value as Rec).imageUrl === 'string' ? (value as Rec).imageUrl : '';
const asText = (value: unknown): string =>
  typeof value === 'string' ? value : value && typeof value === 'object' ? JSON.stringify(value, null, 2) : '';

const isObjectList = (value: unknown): value is Rec[] =>
  Array.isArray(value) && value.length > 0 && value.every((entry) => entry && typeof entry === 'object' && !Array.isArray(entry));

/**
 * One live ComponentContent record -> one admin section.
 * `data` is kept verbatim, so nothing the site shows can be lost on save. The top-level fields mirror what the admin
 * editors show and edit (title, buttons, image, items, slides). Every aliased field is written even when empty, so
 * the code's default text can never leak into the form (and from there into the live site) on the first save.
 */
export function toAdminSection(record: { key: string; label?: string; isActive?: boolean; data?: Rec }): Rec {
  const d: Rec = record.data && typeof record.data === 'object' ? record.data : {};
  const title = first(d.title, d.heading);
  // A heading that differs from the title is kept as its own field, otherwise saving would collapse the two
  const heading = typeof d.heading === 'string' && d.heading !== title ? d.heading : undefined;

  const listKey = ITEM_LISTS.find((key) => isObjectList(d[key]));
  const section: Rec = {
    key: record.key,
    componentKey: record.key,
    name: record.label || record.key,
    enabled: record.isActive !== false,
    title,
    ...(heading !== undefined ? { heading } : {}),
    subtitle: text(d.subtitle),
    description: text(d.description),
    eyebrow: text(d.eyebrow),
    highlight: text(d.highlight),
    buttonLabel: first(d.buttonLabel, d.buttonText, d.primaryButtonText, d.primaryBtnText),
    buttonHref: first(d.buttonHref, d.buttonPath, d.primaryButtonHref, d.primaryBtnPath),
    secondaryButtonLabel: first(d.secondaryButtonLabel, d.secondaryButtonText, d.secondaryBtnText),
    secondaryButtonHref: first(d.secondaryButtonHref, d.secondaryButtonPath, d.secondaryBtnPath),
    icon: first(d.icon, d.iconSrc, d.iconImage),
    image: urlOf(d.image) || urlOf(d.imageUrl) || urlOf(d.imageurl) || urlOf(d.imageSrc),
    bgImage: urlOf(d.bgImage) || urlOf(d.backgroundImage),
    // "itemsField" limits the backend to updating just this list (plus "items"), so the other lists of the section survive a save
    items: listKey ? d[listKey] : [],
    ...(listKey ? { itemsField: listKey } : {}),
    data: d,
  };
  if (Array.isArray(d.slides)) section.slides = d.slides;
  return section;
}

/** Live Page.seo (website names) -> the SEO fields the admin form edits */
export function toAdminSeo(seo: Rec | undefined | null): Rec {
  const s: Rec = seo && typeof seo === 'object' ? seo : {};
  const canonicalUrl = first(s.canonicalUrl, s.canonical);
  return {
    metaTitle: text(s.metaTitle),
    metaDescription: text(s.metaDescription),
    metaKeywords: text(s.metaKeywords),
    canonicalUrl,
    canonicalTag: first(s.canonicalTag) || (canonicalUrl ? `<link rel="canonical" href="${canonicalUrl}" />` : ''),
    openGraphTags: asText(s.openGraphTags ?? s.ogJson),
    ogTitle: text(s.ogTitle),
    ogDescription: text(s.ogDescription),
    ogImage: text(s.ogImage),
    h1Tag: text(s.h1Tag),
    breadcrumbName: text(s.breadcrumbName),
    schemaMarkup: asText(s.schemaMarkup ?? s.schema),
    robotsIndex: s.robotsIndex !== false,
    robotsFollow: s.robotsFollow !== false,
  };
}

/** What the admin cannot reach for a section: object lists and objects other than the editable list / slides / images */
const notEditable = (record: { data?: Rec }, section: Rec): string[] => {
  const d = record.data || {};
  const handled = new Set<string>([...ITEM_LISTS, 'slides', 'image', 'bgImage', 'backgroundImage']);
  return Object.keys(d).filter((key) => {
    if (handled.has(key)) return key === section.itemsField ? false : isObjectList(d[key]) && key !== section.itemsField && ITEM_LISTS.includes(key as (typeof ITEM_LISTS)[number]) && false;
    const v = d[key];
    return isObjectList(v) || (v && typeof v === 'object' && !Array.isArray(v) && key !== 'image' && key !== 'imageurl');
  });
};

const slugVariants = (slugs: string[]): string[] => [...new Set(slugs.flatMap((s) => [s, s.startsWith('/') ? s.slice(1) : `/${s}`]))];

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const force = args.includes('--force');
  const only = args.find((a) => a.startsWith('--only='))?.slice('--only='.length).split(',').filter(Boolean);

  await connectDatabase();
  console.log(`\nDatabase: "${mongoose.connection.name}"   mode: ${apply ? 'APPLY (writes)' : 'DRY RUN (writes nothing)'}${force ? '   --force' : ''}\n`);

  const settingsDoc: any = await Settings.findOne({ website: 'ensis' }).lean();
  const stored: Rec = settingsDoc?.data || {};
  const now = new Date().toISOString();

  let filled = 0;
  let skipped = 0;
  for (const def of PAGES) {
    if (only && !only.includes(def.configKey)) continue;

    const existing = stored[def.configKey];
    const savedSections = Array.isArray(existing?.sections) ? existing.sections.length : 0;
    if (savedSections > 0 && !force) {
      console.log(`- ${def.configKey.padEnd(24)} skipped: the admin already has ${savedSections} saved sections (use --force to rebuild)`);
      skipped++;
      continue;
    }

    const filter = def.keys ? { key: { $in: def.keys } } : { page: def.prefix };
    const records: any[] = await ComponentContentModel.find(filter).sort({ index: 1, key: 1 }).lean();
    if (records.length === 0) {
      console.log(`- ${def.configKey.padEnd(24)} skipped: no live content found (${def.keys ? def.keys.join(', ') : `page "${def.prefix}"`})`);
      skipped++;
      continue;
    }

    const pageDoc: any = await Page.findOne({ $or: [{ configKey: def.configKey }, { slug: { $in: slugVariants(def.slugs) } }] }).lean();
    const sections = records.map((record) => toAdminSection(record));
    const config = {
      title: pageDoc?.pageName || def.pageName,
      slug: pageDoc?.slug || def.slugs[0],
      status: pageDoc?.status || 'Published',
      visibility: pageDoc?.visibility || 'Public',
      author: pageDoc?.author || 'Ensis Admin',
      updatedBy: 'CMS backfill',
      publishedAt: pageDoc?.createdAt ? new Date(pageDoc.createdAt).toISOString() : now,
      lastUpdated: now,
      seo: toAdminSeo(pageDoc?.seo),
      sections,
    };

    console.log(`+ ${def.configKey.padEnd(24)} ${sections.length} sections from live content` +
      `${pageDoc ? `   (Page "${pageDoc.slug}"${pageDoc.configKey ? '' : ': will get configKey'})` : '   (no Page document yet: the first save creates it)'}`);
    records.forEach((record, i) => {
      const section = sections[i];
      const edit = [
        section.title && 'title',
        section.description && 'description',
        section.buttonLabel && 'button',
        section.image && 'image',
        section.slides && `slides:${section.slides.length}`,
        section.itemsField && `list "${section.itemsField}":${section.items.length}`,
      ].filter(Boolean);
      const fixed = notEditable(record, section);
      console.log(`    ${String(record.key).padEnd(34)} editable: ${edit.join(', ') || '-'}${fixed.length ? `   | kept as is, not editable in admin: ${fixed.join(', ')}` : ''}`);
    });

    if (apply) {
      await Settings.updateOne({ website: 'ensis' }, { $set: { website: 'ensis', [`data.${def.configKey}`]: config } }, { upsert: true });
      if (pageDoc && !pageDoc.configKey) await Page.updateOne({ _id: pageDoc._id }, { $set: { configKey: def.configKey } });
    }
    filled++;
  }

  console.log(`\n${apply ? 'Done' : 'Dry run'}: ${filled} page${filled === 1 ? '' : 's'} ${apply ? 'filled' : 'would be filled'}, ${skipped} skipped.`);
  if (!apply && filled > 0) console.log('Nothing was written. Run again with --apply to write.');
  console.log('ComponentContent, Page.sections and Page.seo are never touched: the website does not change.\n');

  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
  });
}
