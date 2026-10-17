import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Backs up everything the live API exposes into a separate LOCAL database (default "ensis-backup")
 * plus a JSON copy in ../db-backups/live-<timestamp>/.
 *
 * Safety:
 * - Live is only read with GET requests; nothing is ever sent to live.
 * - Writes go only to a localhost MongoDB, and never to the working "ensis" database.
 */
const LIVE_API = (process.env.LIVE_API_URL || 'https://api.ensis.in/api/v1').replace(/\/+$/, '');
const BACKUP_URI = process.env.BACKUP_MONGO_URI || 'mongodb://localhost:27017';
const BACKUP_DB = process.env.BACKUP_DB_NAME || 'ensis-backup';

const PAGE_KEYS = [
  'home', 'about', 'about-us', 'turnkey', 'turnkey-solutions', 'consultancy', 'custom-solutions', 'products',
  'projects', 'projects-and-clients', 'blog', 'career', 'careers', 'contact', 'contact-us', 'enquiry',
  'privacy-policy', 'terms-and-conditions',
];
const COMPONENT_PAGES = ['home', 'about', 'turnkey', 'consultancy', 'product', 'projects', 'blog', 'career', 'contact', 'enquiry'];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** GET only; 401/403/404 resolve to null (that data is not public) */
const getLive = async (pathname: string, tries = 3): Promise<any> => {
  const url = `${LIVE_API}${pathname}`;
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(30000) });
      if ([401, 403, 404].includes(res.status)) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body: any = await res.json();
      return body && typeof body === 'object' && 'data' in body ? body.data : body;
    } catch (error) {
      if (attempt >= tries) throw new Error(`${url}: ${error instanceof Error ? error.message : error}`);
      await sleep(700 * attempt);
    }
  }
};

const fetchAllProducts = async (): Promise<any[]> => {
  const all: any[] = [];
  for (let page = 1; page <= 200; page++) {
    const data = await getLive(`/products?page=${page}&limit=100&includeInactive=true`);
    if (!Array.isArray(data?.products) || data.products.length === 0) break;
    all.push(...data.products);
    if (all.length >= (Number(data.total) || all.length)) break;
  }
  return all;
};

const fetchPages = async (): Promise<any[]> => {
  const bySlug = new Map<string, any>();
  for (const key of PAGE_KEYS) {
    const page = await getLive(`/pages/${encodeURIComponent(key)}`);
    if (page?._id) bySlug.set(String(page._id), page);
  }
  return [...bySlug.values()];
};

/** Live string ids become real ObjectIds again, so the backup can be restored as-is */
const reviveIds = (value: any, key = ''): any => {
  if (Array.isArray(value)) return value.map((v) => reviveIds(v, key));
  if (value && typeof value === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) out[k] = reviveIds(v, k);
    return out;
  }
  if (typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value) && (key === '_id' || key === 'category' || key.endsWith('Id'))) {
    return new ObjectId(value);
  }
  if (typeof value === 'string' && (key === 'createdAt' || key === 'updatedAt') && !Number.isNaN(Date.parse(value))) {
    return new Date(value);
  }
  return value;
};

const asList = (value: any): any[] => (Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : []);

const main = async (): Promise<void> => {
  if (!/localhost|127\.0\.0\.1/.test(BACKUP_URI)) throw new Error(`Refusing to write a backup anywhere but a local MongoDB (${BACKUP_URI})`);
  if (BACKUP_DB === 'ensis') throw new Error('Refusing to overwrite the working "ensis" database; use a separate backup database');

  console.log(`Reading live data (GET only) from ${LIVE_API} ...`);
  const componentsByPage: Record<string, string[]> = {};
  for (const page of COMPONENT_PAGES) {
    const list = await getLive(`/component-content/page/${page}?includeInactive=true`);
    componentsByPage[page] = asList(list).map((c: any) => c?.key).filter(Boolean);
  }

  const collections: Record<string, any[]> = {
    categories: asList(await getLive('/categories')),
    products: await fetchAllProducts(),
    componentcontents: asList(await getLive('/component-content?includeInactive=true')),
    pages: await fetchPages(),
    blogs: asList(await getLive('/blogs?all=1')),
    careers: asList(await getLive('/careers')),
    solutions: asList(await getLive('/solutions')),
    projects: asList(await getLive('/projects')),
    seos: asList(await getLive('/seo')),
    // Single documents kept as one record each
    navigation: asList(await getLive('/navigation')),
    footer: asList(await getLive('/footer')),
    seo_advanced: asList(await getLive('/seo/advanced')),
    page_section_order: [{ _id: 'componentsByPage', ...componentsByPage }],
  };

  const fetchedAt = new Date();
  const stamp = fetchedAt.toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
  const fileDir = path.resolve(process.cwd(), '..', 'db-backups', `live-${stamp}`);
  fs.mkdirSync(fileDir, { recursive: true });
  for (const [name, docs] of Object.entries(collections)) {
    fs.writeFileSync(path.join(fileDir, `${name}.json`), JSON.stringify(docs, null, 2), 'utf8');
  }

  const client = new MongoClient(BACKUP_URI);
  await client.connect();
  try {
    const db = client.db(BACKUP_DB);
    for (const [name, docs] of Object.entries(collections)) {
      await db.collection(name).deleteMany({});
      if (docs.length) await db.collection(name).insertMany(docs.map((d) => reviveIds(d)));
    }
    const counts = Object.fromEntries(Object.entries(collections).map(([k, v]) => [k, v.length]));
    await db.collection('_backup_info').deleteMany({});
    await db.collection('_backup_info').insertOne({ source: LIVE_API, fetchedAt, counts, fileCopy: fileDir });

    console.log(`Backup written to local MongoDB: ${BACKUP_URI}/${BACKUP_DB}`);
    console.log(`JSON copy: ${fileDir}`);
    Object.entries(counts).forEach(([k, v]) => console.log(`  ${k.padEnd(20)} ${v}`));
  } finally {
    await client.close();
  }
};

main().catch((error) => {
  console.error('LIVE BACKUP FAILED:', error instanceof Error ? error.message : error);
  process.exit(1);
});
