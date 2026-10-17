import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.config';
import { ProductModel } from '../models/product.model';
import { CategoryModel } from '../models/category.model';
import { isObjectIdString } from '../utils/object-id';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Brings back products that exist on the live site but are missing locally (e.g. deleted by mistake).
 * Reads the live API with GET only. Products that already exist locally are never touched,
 * so local edits (city pages, prices, images) are kept. `--dry-run` only lists what is missing.
 */
const LIVE_API = (process.env.LIVE_API_URL || 'https://api.ensis.in/api/v1').replace(/\/+$/, '');
const DRY_RUN = process.argv.includes('--dry-run');

const getLive = async (pathname: string): Promise<any> => {
  const res = await fetch(`${LIVE_API}${pathname}`, { method: 'GET' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${LIVE_API}${pathname}`);
  const body: any = await res.json();
  return body && typeof body === 'object' && 'data' in body ? body.data : body;
};

const fetchLiveProducts = async (): Promise<any[]> => {
  const all: any[] = [];
  for (let page = 1; page <= 200; page++) {
    const data = await getLive(`/products?page=${page}&limit=100&includeInactive=true`);
    if (!Array.isArray(data?.products) || data.products.length === 0) break;
    all.push(...data.products);
    if (all.length >= (Number(data.total) || all.length)) break;
  }
  return all;
};

const idOf = (value: any): string | undefined => {
  const id = value && typeof value === 'object' ? value._id : value;
  return typeof id === 'string' && isObjectIdString(id) ? id : undefined;
};

const main = async (): Promise<void> => {
  console.log(`Reading live products (GET only) from ${LIVE_API} ...`);
  const [liveProducts, liveCategories] = await Promise.all([fetchLiveProducts(), getLive('/categories')]);
  console.log(`  live products: ${liveProducts.length}`);

  await connectDatabase();
  try {
    const local = await ProductModel.collection.find({}, { projection: { slug: 1 } }).toArray();
    const localSlugs = new Set(local.map((p: any) => p.slug));
    const localIds = new Set(local.map((p: any) => String(p._id)));
    const missing = liveProducts.filter((p) => p?.slug && !localSlugs.has(p.slug));

    if (missing.length === 0) {
      console.log('Nothing to restore: every live product exists locally.');
      return;
    }
    console.log(`Missing locally (${missing.length}):`);
    missing.forEach((p) => console.log(`  - ${p.slug}  "${String(p.title || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}"`));
    if (DRY_RUN) {
      console.log('Dry run: nothing written.');
      return;
    }

    // Live category id → local category id (matched by slug, then name)
    const liveCatById = new Map<string, any>((Array.isArray(liveCategories) ? liveCategories : []).map((c: any) => [String(c._id), c]));
    const localCats = await CategoryModel.find().select('slug name').lean();
    const catBySlug = new Map(localCats.map((c: any) => [c.slug, c._id]));
    const catByName = new Map(localCats.map((c: any) => [c.name, c._id]));

    for (const product of missing) {
      const doc: any = { ...product };
      delete doc.__v;
      const liveId = idOf(product);
      // Keep the live id when it is free, so links and orders that point at it still work
      if (liveId && !localIds.has(liveId)) doc._id = new mongoose.Types.ObjectId(liveId);
      else delete doc._id;

      const ref = typeof product.category === 'object' ? product.category : liveCatById.get(String(product.category));
      const categoryId = ref ? catBySlug.get(ref.slug) || catByName.get(ref.name) : undefined;
      if (categoryId) doc.category = categoryId;
      else {
        delete doc.category;
        console.warn(`  ! "${product.slug}": category not found locally (left unset)`);
      }

      if (Array.isArray(doc.reviews)) {
        doc.reviews = doc.reviews.map(idOf).filter(Boolean).map((id: string) => new mongoose.Types.ObjectId(id));
      }
      doc.createdAt = product.createdAt ? new Date(product.createdAt) : new Date();
      doc.updatedAt = new Date();

      await ProductModel.collection.insertOne(doc);
      console.log(`  restored: ${product.slug}`);
    }
    console.log(`Done: ${missing.length} product(s) restored.`);
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((error) => {
  console.error('RESTORE FAILED:', error instanceof Error ? error.message : error);
  process.exit(1);
});
