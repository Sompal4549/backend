import https from 'https';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGO_URI =
  process.env.MONGO_URI_MAIN ||
  process.env.MONGODB_URI ||
  process.env.MONGO_URI_LOCAL ||
  'mongodb://localhost:27017/ensis';

async function fetchFromLive(page: number): Promise<any[]> {
  return new Promise((resolve) => {
    https.get(`https://api.ensis.in/api/v1/products?page=${page}&limit=50`, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.data?.products || json.products || []);
        } catch {
          resolve([]);
        }
      });
    }).on('error', (err) => {
      console.error('Fetch error:', err.message);
      resolve([]);
    });
  });
}

async function syncImages() {
  console.log('Connecting to MongoDB at:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB:', mongoose.connection.name);

  const db = mongoose.connection.db!;
  const productsCollection = db.collection('products');

  console.log('Fetching live product images from https://api.ensis.in...');
  const page1 = await fetchFromLive(1);
  const page2 = await fetchFromLive(2);
  const liveProducts = [...page1, ...page2];
  console.log(`Retrieved ${liveProducts.length} live products with images.`);

  let updatedCount = 0;

  for (const live of liveProducts) {
    if (!live.images || live.images.length === 0) continue;

    // Match by code first, then slug, then title
    const filter = live.code
      ? { code: live.code }
      : live.slug
      ? { slug: live.slug }
      : { title: live.title };

    const res = await productsCollection.updateOne(filter, {
      $set: {
        images: live.images,
      },
    });

    if (res.matchedCount > 0) {
      updatedCount++;
      console.log(`[UPDATED] ${live.code || live.slug} -> ${live.images.length} images`);
    } else {
      console.log(`[NO MATCH] ${live.code || live.title}`);
    }
  }

  console.log(`\n🎉 Successfully synced images for ${updatedCount} products!`);
  await mongoose.disconnect();
}

syncImages().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
