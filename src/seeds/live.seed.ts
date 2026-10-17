import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import slugify from 'slugify';
import { connectDatabase } from '../config/database.config';
import Page from '../models/page.model';
import { ComponentContentModel } from '../models/component-content.model';
import { CategoryModel } from '../models/category.model';
import { ProductModel } from '../models/product.model';
import { NavigationModel } from '../models/navigation.model';
import { FooterModel } from '../models/footer.model';
import Seo from '../models/seo.models';
import { SolutionModel } from '../models/solution.model';
import { ProjectModel } from '../models/project.model';
import { BlogModel } from '../models/blog.model';
import { syncCmsFromLive } from './live-cms-adapter';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const LIVE_API = (process.env.LIVE_API_URL || 'https://api.ensis.in/api/v1').replace(/\/+$/, '');
const SNAPSHOT_FILE = path.join(__dirname, 'live-snapshots', 'snapshot.json');

/** Keys probed against live GET /pages/:slug — live stores short slugs (e.g. "about"). */
const PAGE_KEYS = [
  'home',
  'about',
  'about-us',
  'turnkey',
  'turnkey-solutions',
  'consultancy',
  'custom-solutions',
  'products',
  'projects',
  'projects-and-clients',
  'blog',
  'career',
  'careers',
  'contact',
  'contact-us',
  'enquiry',
  'privacy-policy',
  'terms-and-conditions',
];

/** Page names the storefront passes to GET /component-content/page/:page */
const LIVE_COMPONENT_PAGES = ['home', 'about', 'turnkey', 'consultancy', 'product', 'projects', 'blog', 'career', 'contact', 'enquiry'];

interface LiveResponse {
  ok: boolean;
  status: number;
  json(): Promise<any>;
}

const fetchFn = (globalThis as any).fetch as (url: string, init?: { method?: string }) => Promise<LiveResponse>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const unwrap = (body: any): any => (body && typeof body === 'object' && 'data' in body ? body.data : body);

/** GET-only live fetch. Never mutates the live API. 404 resolves to null. */
const fetchLive = async (pathname: string, tries = 3): Promise<any> => {
  const url = `${LIVE_API}${pathname}`;
  let lastError: unknown;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetchFn(url, { method: 'GET' });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return unwrap(await res.json());
    } catch (error) {
      lastError = error;
      if (attempt < tries) await sleep(500 * attempt);
    }
  }
  throw lastError;
};

const fetchAllProducts = async (): Promise<any[]> => {
  const all: any[] = [];
  let page = 1;
  let total = Number.POSITIVE_INFINITY;
  while (all.length < total && page <= 200) {
    const data = await fetchLive(`/products?page=${page}&limit=100&includeInactive=true`);
    if (!data || !Array.isArray(data.products) || data.products.length === 0) break;
    all.push(...data.products);
    total = Number(data.total) || all.length;
    page += 1;
  }
  return all;
};

const fetchPages = async (): Promise<any[]> => {
  const bySlug = new Map<string, any>();
  const missing: string[] = [];
  for (const key of PAGE_KEYS) {
    const page = await fetchLive(`/pages/${encodeURIComponent(key)}`);
    if (page && page.slug) bySlug.set(page.slug, page);
    else missing.push(key);
  }
  if (missing.length) console.log(`  pages not present live: ${missing.join(', ')}`);
  return [...bySlug.values()];
};

const fetchSnapshot = async (): Promise<any> => {
  console.log(`Fetching live content (GET only) from ${LIVE_API} ...`);
  const snapshot: any = { source: LIVE_API, fetchedAt: new Date().toISOString() };
  snapshot.categories = (await fetchLive('/categories')) || [];
  snapshot.componentContents = (await fetchLive('/component-content?includeInactive=true')) || [];
  snapshot.navigation = (await fetchLive('/navigation')) || null;
  snapshot.footer = (await fetchLive('/footer')) || null;
  snapshot.seo = (await fetchLive('/seo')) || [];
  snapshot.solutions = (await fetchLive('/solutions')) || [];
  snapshot.projects = (await fetchLive('/projects')) || [];
  snapshot.blogs = (await fetchLive('/blogs')) || [];
  snapshot.products = await fetchAllProducts();
  snapshot.pages = await fetchPages();
  // Which sections each live page renders, in order (local admin sections are rebuilt to match)
  snapshot.pageOrder = {};
  for (const page of LIVE_COMPONENT_PAGES) {
    const list = await fetchLive(`/component-content/page/${page}`);
    if (Array.isArray(list)) {
      snapshot.pageOrder[page] = list.filter((c: any) => c?.key && c.isActive !== false).map((c: any) => c.key);
    }
  }

  const counts = [
    ['categories', snapshot.categories],
    ['products', snapshot.products],
    ['componentContents', snapshot.componentContents],
    ['seo', snapshot.seo],
    ['solutions', snapshot.solutions],
    ['projects', snapshot.projects],
    ['blogs', snapshot.blogs],
    ['pages', snapshot.pages],
  ] as const;
  console.log('Fetched:');
  for (const [name, list] of counts) console.log(`  ${name}: ${(list as any[]).length}`);
  console.log(`  navigation: ${snapshot.navigation ? 'yes' : 'missing'}`);
  console.log(`  footer: ${snapshot.footer ? 'yes' : 'missing'}`);
  return snapshot;
};

const writeSnapshot = (snapshot: any): void => {
  fs.mkdirSync(path.dirname(SNAPSHOT_FILE), { recursive: true });
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2), 'utf8');
  console.log(`Snapshot saved: ${SNAPSHOT_FILE}`);
};

const readSnapshot = (): any => {
  if (!fs.existsSync(SNAPSHOT_FILE)) {
    throw new Error(`No snapshot found at ${SNAPSHOT_FILE}. Run without --from-snapshot first.`);
  }
  console.log(`Reading snapshot: ${SNAPSHOT_FILE}`);
  return JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));
};

/** Strip fields that must never be forced onto the local document. */
const cleanDoc = (doc: any): any => {
  const clone = { ...doc };
  delete clone._id;
  delete clone.createdAt;
  delete clone.updatedAt;
  delete clone.__v;
  return clone;
};

const replaceOneById = async (model: any, filter: any, doc: any): Promise<number> => {
  const replacement = cleanDoc(doc);
  await model.collection.replaceOne(filter, replacement, { upsert: true });
  return 1;
};

const seedCategories = async (snapshot: any): Promise<Map<string, mongoose.Types.ObjectId>> => {
  const liveIdToSlug = new Map<string, string>();
  let upserted = 0;
  for (const category of snapshot.categories || []) {
    if (!category?.name) continue;
    const slug = category.slug || slugify(category.name, { lower: true, strict: true });
    if (category._id) liveIdToSlug.set(String(category._id), slug);
    await replaceOneById(CategoryModel, { slug }, { ...category, slug, isActive: category.isActive ?? true });
    upserted += 1;
  }
  console.log(`  categories: ${upserted} upserted`);

  const slugToLocalId = new Map<string, mongoose.Types.ObjectId>();
  const localCategories = await CategoryModel.find().lean();
  for (const category of localCategories) {
    if (category.slug) slugToLocalId.set(category.slug, category._id as mongoose.Types.ObjectId);
  }
  const liveIdToLocalId = new Map<string, mongoose.Types.ObjectId>();
  for (const [liveId, slug] of liveIdToSlug) {
    const localId = slugToLocalId.get(slug);
    if (localId) liveIdToLocalId.set(liveId, localId);
  }
  return liveIdToLocalId;
};

const seedProducts = async (snapshot: any, liveCatIdToLocalId: Map<string, mongoose.Types.ObjectId>): Promise<number> => {
  const localCategories = await CategoryModel.find().select('slug name').lean();
  const bySlug = new Map(localCategories.map((c) => [c.slug, c._id as mongoose.Types.ObjectId]));
  const byName = new Map(localCategories.map((c) => [c.name, c._id as mongoose.Types.ObjectId]));
  let count = 0;
  for (const product of snapshot.products || []) {
    if (!product?.slug) {
      console.warn('  ! product without slug skipped');
      continue;
    }
    const doc = cleanDoc(product);
    const ref = product.category;
    let categoryId: mongoose.Types.ObjectId | undefined;
    if (ref && typeof ref === 'object') {
      categoryId = ref.slug ? bySlug.get(ref.slug) : undefined;
      if (!categoryId && ref.name) categoryId = byName.get(ref.name);
    } else if (typeof ref === 'string') {
      categoryId = liveCatIdToLocalId.get(ref);
    }
    if (categoryId) doc.category = categoryId;
    else {
      delete doc.category;
      console.warn(`  ! product "${product.slug}" category could not be resolved (left unset)`);
    }
    await ProductModel.collection.replaceOne({ slug: product.slug }, doc, { upsert: true });
    count += 1;
  }
  console.log(`  products: ${count} upserted`);
  return count;
};

/** Removes local docs that are no longer present in the snapshot. Skipped for empty snapshots. */
const pruneMissing = async (model: any, field: string, keep: any[], label: string): Promise<void> => {
  if (!keep.length) {
    console.warn(`  ${label}: prune skipped (snapshot empty)`);
    return;
  }
  const result = await model.collection.deleteMany({ [field]: { $nin: keep } });
  console.log(`  ${label}: ${result.deletedCount} pruned`);
};

const seedLocal = async (snapshot: any, prune: boolean): Promise<void> => {
  console.log(`\nSeeding local database "${mongoose.connection.name}"`);
  if (mongoose.connection.name !== 'ensis') {
    console.warn('  Warning: active database is not "ensis". Check MONGO_URI_MAIN in .env.');
  }

  const kept = {
    categories: [] as string[],
    products: [] as string[],
    pages: [] as string[],
    components: [] as string[],
    seo: [] as string[],
    solutions: [] as string[],
    projects: [] as string[],
    blogs: [] as string[],
  };

  console.log('- categories');
  const liveCatIdToLocalId = await seedCategories(snapshot);
  for (const category of snapshot.categories || []) {
    if (category?.name) kept.categories.push(category.slug || slugify(category.name, { lower: true, strict: true }));
  }
  console.log('- products');
  await seedProducts(snapshot, liveCatIdToLocalId);
  for (const product of snapshot.products || []) if (product?.slug) kept.products.push(product.slug);
  // Live Page docs hold only SEO under short slugs ("about"); copying them would create
  // duplicates of the local pages. Their SEO is merged by syncCmsFromLive below instead.
  for (const page of await Page.find().select('slug').lean()) if (page.slug) kept.pages.push(page.slug);
  console.log('- component contents');
  for (const component of snapshot.componentContents || []) {
    if (!component?.key) continue;
    await replaceOneById(ComponentContentModel, { key: component.key }, component);
    kept.components.push(component.key);
  }
  console.log(`  componentContents: ${kept.components.length} upserted`);
  console.log('- admin page sections (from live content)');
  const report = await syncCmsFromLive(snapshot);
  console.log(`  sections updated: ${report.sectionsUpdated}, kept (local only): ${report.sectionsKept.length}`);
  console.log(`  seo merged: ${report.seoMerged.join(', ') || '-'}`);
  if (report.liveOnlyComponents.length) {
    console.log(`  live components without an admin section: ${report.liveOnlyComponents.join(', ')}`);
  }
  console.log('- navigation / footer');
  if (snapshot.navigation) {
    const navKey = snapshot.navigation.key || 'main';
    await replaceOneById(NavigationModel, { key: navKey }, { ...snapshot.navigation, key: navKey });
  } else console.warn('  ! navigation missing in snapshot');
  if (snapshot.footer) {
    const footerKey = snapshot.footer.key || 'main';
    await replaceOneById(FooterModel, { key: footerKey }, { ...snapshot.footer, key: footerKey });
  } else console.warn('  ! footer missing in snapshot');
  console.log('- seo');
  for (const entry of snapshot.seo || []) {
    if (!entry?.slug) continue;
    await replaceOneById(Seo, { slug: entry.slug }, entry);
    kept.seo.push(entry.slug);
  }
  console.log(`  seo: ${kept.seo.length} upserted`);
  console.log('- solutions');
  for (const solution of snapshot.solutions || []) {
    if (!solution?.slug) continue;
    await replaceOneById(SolutionModel, { slug: solution.slug }, solution);
    kept.solutions.push(solution.slug);
  }
  console.log(`  solutions: ${kept.solutions.length} upserted`);
  console.log('- projects');
  for (const project of snapshot.projects || []) {
    if (!project?.title) continue;
    await replaceOneById(ProjectModel, { title: project.title }, project);
    kept.projects.push(project.title);
  }
  console.log(`  projects: ${kept.projects.length} upserted`);
  console.log('- blogs');
  for (const blog of snapshot.blogs || []) {
    if (!blog?.slug) continue;
    await replaceOneById(BlogModel, { slug: blog.slug }, blog);
    kept.blogs.push(blog.slug);
  }
  console.log(`  blogs: ${kept.blogs.length} upserted`);

  if (prune) {
    // Keep every category referenced by a kept product so pruning never dangles refs.
    if (kept.products.length) {
      const refs = await ProductModel.find({ slug: { $in: kept.products } }).select('category').lean();
      const catIds = refs.map((ref) => ref.category).filter(Boolean);
      const referenced = await CategoryModel.find({ _id: { $in: catIds } }).select('slug').lean();
      for (const category of referenced) if (category.slug) kept.categories.push(category.slug);
    }
    console.log('- prune (local docs absent from live)');
    await pruneMissing(ProductModel, 'slug', kept.products, 'products');
    await pruneMissing(CategoryModel, 'slug', kept.categories, 'categories');
    await pruneMissing(Page, 'slug', kept.pages, 'pages');
    await pruneMissing(ComponentContentModel, 'key', kept.components, 'componentContents');
    await pruneMissing(Seo, 'slug', kept.seo, 'seo');
    await pruneMissing(SolutionModel, 'slug', kept.solutions, 'solutions');
    await pruneMissing(ProjectModel, 'title', kept.projects, 'projects');
    await pruneMissing(BlogModel, 'slug', kept.blogs, 'blogs');
  }
};

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const fetchOnly = args.includes('--fetch-only');
  const fromSnapshot = args.includes('--from-snapshot');
  const prune = args.includes('--prune');

  const snapshot = fromSnapshot ? readSnapshot() : await fetchSnapshot();

  if (!fromSnapshot) writeSnapshot(snapshot);
  if (fetchOnly) {
    console.log('\nFetch-only mode: snapshot written, local database untouched.');
    return;
  }

  await connectDatabase();
  try {
    await seedLocal(snapshot, prune);
    console.log('\nLIVE SEED COMPLETE');
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((error) => {
  console.error('\nLIVE SEED FAILED:', error instanceof Error ? error.message : error);
  process.exit(1);
});
