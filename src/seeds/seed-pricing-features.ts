import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI_MAIN || 'mongodb://localhost:27017/ensis';

const DEFAULT_PRICING_FEATURES = [
  {
    title: 'Ayurvedic Heritage',
    image: 'https://res.cloudinary.com/ddjhixcwh/image/upload/v1786085271/ensis/products/bvao36qrc7toxucqo35g.webp'
  },
  {
    title: 'Custom Design',
    image: 'https://res.cloudinary.com/ddjhixcwh/image/upload/v1786085292/ensis/products/uicyqb9jwnypdlr7gtus.webp'
  },
  {
    title: 'Complete Installation',
    image: 'https://res.cloudinary.com/ddjhixcwh/image/upload/v1786085309/ensis/products/bntumuzt1obixepd5si6.webp'
  },
  {
    title: 'Expert Consultation',
    image: 'https://res.cloudinary.com/ddjhixcwh/image/upload/v1786085378/ensis/products/kmins2ubvczihdsvrkzq.webp'
  },
  {
    title: 'Global Delivery',
    image: 'https://res.cloudinary.com/ddjhixcwh/image/upload/v1786085418/ensis/products/js024c445j98ws1z8wap.webp'
  }
];

async function seedPricingFeatures() {
  console.log('Connecting to MongoDB at:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  // 1. Fetch from natural-himalayan-salt-lamp if available
  const saltLamp = await db.collection('products').findOne({ slug: 'natural-himalayan-salt-lamp' });
  const pricingFeatures = (saltLamp?.overview?.productPricingFeatures?.length === 5)
    ? saltLamp.overview.productPricingFeatures
    : DEFAULT_PRICING_FEATURES;

  console.log(`Using ${pricingFeatures.length} pricing features:`);
  pricingFeatures.forEach((f: any, idx: number) => {
    console.log(`  ${idx + 1}. ${f.title} -> ${f.image}`);
  });

  const totalProducts = await db.collection('products').countDocuments();
  console.log(`Total products in local database: ${totalProducts}`);

  // 2. Sample before update to verify fields are preserved
  const sampleSlug = 'handcrafted-ayurvedic-therapy-table';
  const beforeSample = await db.collection('products').findOne({ slug: sampleSlug });
  console.log(`\nBefore update check on [${sampleSlug}]:`);
  console.log(`  - Title/Name: ${beforeSample?.name || beforeSample?.title}`);
  console.log(`  - Price: ${beforeSample?.price}`);
  console.log(`  - Images count: ${beforeSample?.images?.length}`);
  console.log(`  - Existing specs count: ${beforeSample?.overview?.productSpecifications?.length || 0}`);
  console.log(`  - Existing pricing features count: ${beforeSample?.overview?.productPricingFeatures?.length || 0}`);

  // 3. Update all products using $set so NO OTHER FIELD IS TOUCHED OR REMOVED
  const updateResult = await db.collection('products').updateMany(
    {},
    {
      $set: {
        'overview.productPricingFeatures': pricingFeatures
      }
    }
  );

  console.log(`\nUpdate result: matched ${updateResult.matchedCount}, modified ${updateResult.modifiedCount}`);

  // 4. Verify sample after update
  const afterSample = await db.collection('products').findOne({ slug: sampleSlug });
  console.log(`\nAfter update verification on [${sampleSlug}]:`);
  console.log(`  - Title/Name: ${afterSample?.name || afterSample?.title} (preserved)`);
  console.log(`  - Price: ${afterSample?.price} (preserved)`);
  console.log(`  - Images count: ${afterSample?.images?.length} (preserved)`);
  console.log(`  - Existing specs count: ${afterSample?.overview?.productSpecifications?.length || 0} (preserved)`);
  console.log(`  - New pricing features count: ${afterSample?.overview?.productPricingFeatures?.length}`);

  // 5. Check count of all products that now have exactly 5 pricing features
  const verifiedCount = await db.collection('products').countDocuments({
    'overview.productPricingFeatures': { $size: 5 }
  });
  console.log(`\nAll products with 5 pricing features: ${verifiedCount} / ${totalProducts}`);

  await mongoose.disconnect();
  console.log('\nSeed completed safely! MongoDB disconnected.');
}

seedPricingFeatures().catch((err) => {
  console.error('Error seeding pricing features:', err);
  process.exit(1);
});
