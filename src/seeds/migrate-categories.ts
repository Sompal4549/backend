import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { CategoryModel } from '../models/category.model';
import { ProductModel } from '../models/product.model';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const args = process.argv.slice(2);
const hasFlag = (name: string): boolean => args.includes(name);

const isDryRun = hasFlag('--dry-run');
const envArg = args
  .find((arg) => arg.startsWith('--env='))
  ?.slice('--env='.length)
  .trim()
  .toLowerCase();

const LOCAL = hasFlag('--local') || envArg === 'local';

const resolveMongoUri = (): string => {
  if (LOCAL) {
    const uri = (process.env.MONGO_URI_LOCAL || process.env.MONGO_URI || 'mongodb://localhost:27017/ensis').trim();
    return uri;
  }
  const uri = (process.env.MONGO_URI_MAIN || process.env.MONGO_URI_LOCAL || process.env.MONGO_URI || 'mongodb://localhost:27017/ensis').trim();
  return uri;
};

/**
 * Clean mapping of all old sub-categories to the 8 official primary categories.
 */
export const CATEGORY_MAPPING: Record<string, string> = {
  // 1. Panchkarma Tables & Equipment (11 products)
  "Panchkarma Beds": "Panchkarma Tables & Equipment",
  "Bench": "Panchkarma Tables & Equipment",
  "Stands": "Panchkarma Tables & Equipment",
  "Panchkarma Therapy Set": "Panchkarma Tables & Equipment",

  // 2. Ayurveda Therapy Equipment (14 products)
  "Basti Netra": "Ayurveda Therapy Equipment",
  "Netram": "Ayurveda Therapy Equipment",
  "Nasya Yantra": "Ayurveda Therapy Equipment",
  "SHIRODHARA POT": "Ayurveda Therapy Equipment",
  "Bowl": "Ayurveda Therapy Equipment",
  "Oil Laddle": "Ayurveda Therapy Equipment",
  "NILAVILAKKU": "Ayurveda Therapy Equipment",
  "Mortar & Pestle": "Ayurveda Therapy Equipment",
  "Tumbler Set": "Ayurveda Therapy Equipment",

  // 3. Spa & Wellness Furniture (14 products)
  "Trolley": "Spa & Wellness Furniture",
  "Stool": "Spa & Wellness Furniture",
  "Step Stool": "Spa & Wellness Furniture",
  "Spa Furniture": "Spa & Wellness Furniture",

  // 4. Hydrotherapy Equipment (11 products)
  "Steam Chambers": "Hydrotherapy Equipment",
  "Steam Box": "Hydrotherapy Equipment",
  "Steam Generator": "Hydrotherapy Equipment",
  "Sauna Cabin": "Hydrotherapy Equipment",
  "Tub": "Hydrotherapy Equipment",
  "Stone Heater": "Hydrotherapy Equipment",
  "Sauna Heater": "Hydrotherapy Equipment",
  "Nadi Swedan Yandra": "Hydrotherapy Equipment",

  // 5. Massage & Treatment Tables (9 products)
  "Spa Massage Tables": "Massage & Treatment Tables",

  // 6. Consultation & Examination Furniture (1 product)
  "Herbal Storage Cabinet": "Consultation & Examination Furniture",

  // 7. Hospitality & Resort Spa Setup (10 products)
  "Tray Set": "Hospitality & Resort Spa Setup",
  "Multi Purpose Tray": "Hospitality & Resort Spa Setup",
  "Diffuser": "Hospitality & Resort Spa Setup",
  "Oil Burner": "Hospitality & Resort Spa Setup",
  "Lamp": "Hospitality & Resort Spa Setup",
  "Heater": "Hospitality & Resort Spa Setup",

  // 8. Accessories & Consumables (6 products)
  "Brass Accessories": "Accessories & Consumables",
  "Wooden Accessories": "Accessories & Consumables",
  "SPOON": "Accessories & Consumables",
};

export const NEW_CATEGORIES = [
  "Panchkarma Tables & Equipment",
  "Ayurveda Therapy Equipment",
  "Spa & Wellness Furniture",
  "Hydrotherapy Equipment",
  "Massage & Treatment Tables",
  "Consultation & Examination Furniture",
  "Hospitality & Resort Spa Setup",
  "Accessories & Consumables",
];

const main = async (): Promise<void> => {
  const uri = resolveMongoUri();
  const maskedUri = uri.replace(/:([^@/]+)@/, ':****@');

  console.log('='.repeat(70));
  console.log(` CATEGORY MIGRATION SCRIPT (${LOCAL ? 'LOCAL' : 'MAIN'}) ${isDryRun ? '[DRY RUN]' : '[LIVE]'}`);
  console.log(` Connecting to: ${maskedUri}`);
  console.log('='.repeat(70));

  await mongoose.connect(uri, {
    autoIndex: true,
    serverSelectionTimeoutMS: 15000,
  });
  console.log(`Connected to database: ${mongoose.connection.name}\n`);

  try {
    const products = await ProductModel.find({}).populate('category');
    const existingCategories = await CategoryModel.find({});

    console.log(`Total Products in DB: ${products.length}`);
    console.log(`Total Existing Categories in DB: ${existingCategories.length}\n`);

    // Step 0: Backup if NOT a dry run
    if (!isDryRun) {
      const backupDir = path.join(__dirname, 'live-snapshots');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupDir, `pre-category-migration-${timestamp}.json`);

      const rawProducts = await ProductModel.find({}).lean();
      const rawCategories = await CategoryModel.find({}).lean();

      fs.writeFileSync(
        backupFile,
        JSON.stringify({ backedUpAt: new Date(), categories: rawCategories, products: rawProducts }, null, 2),
        'utf8'
      );
      console.log(`[BACKUP CREATED] Saved snapshot of all products and categories to:`);
      console.log(`  -> ${backupFile}\n`);
    }

    // Step 1: Ensure new categories exist
    console.log('--- Step 1: Ensuring 8 New Categories Exist ---');
    const categoryIds = new Map<string, mongoose.Types.ObjectId>();

    for (const catName of NEW_CATEGORIES) {
      let cat = await CategoryModel.findOne({ name: catName });
      if (!cat) {
        if (!isDryRun) {
          cat = await CategoryModel.create({ name: catName, isActive: true });
          console.log(`[CREATE] Created new category: "${catName}" (ID: ${cat._id})`);
        } else {
          const fakeId = new mongoose.Types.ObjectId();
          console.log(`[DRY-RUN] Would create category: "${catName}"`);
          categoryIds.set(catName, fakeId);
          continue;
        }
      } else {
        console.log(`[FOUND] Existing category: "${catName}" (ID: ${cat._id})`);
      }
      if (cat) {
        categoryIds.set(catName, cat._id as mongoose.Types.ObjectId);
      }
    }

    // Step 2: Migrate Products
    console.log('\n--- Step 2: Mapping Products to New Categories ---');
    const countsPerNewCat: Record<string, number> = {};
    for (const name of NEW_CATEGORIES) {
      countsPerNewCat[name] = 0;
    }

    let updatedCount = 0;
    let unmappedCount = 0;

    for (const product of products) {
      const currentCat = product.category as any;
      const oldCatName = currentCat?.name;

      if (!oldCatName) {
        console.warn(`[WARN] Product "${product.title}" (${product.code}) has no category assigned!`);
        unmappedCount++;
        continue;
      }

      const targetNewCat = CATEGORY_MAPPING[oldCatName];
      if (!targetNewCat) {
        console.warn(`[WARN] Unmapped category "${oldCatName}" on product: "${product.title}"`);
        unmappedCount++;
        continue;
      }

      countsPerNewCat[targetNewCat] = (countsPerNewCat[targetNewCat] || 0) + 1;
      const newCatId = categoryIds.get(targetNewCat);

      if (String(currentCat._id) !== String(newCatId)) {
        if (!isDryRun && newCatId) {
          product.category = newCatId as any;
          await product.save();
        }
        updatedCount++;
      }
    }

    // Step 3: Deactivate old categories
    console.log('\n--- Step 3: Deactivating Old Categories ---');
    let deactivatedCount = 0;
    for (const cat of existingCategories) {
      if (!NEW_CATEGORIES.includes(cat.name)) {
        if (cat.isActive) {
          if (!isDryRun) {
            cat.isActive = false;
            await cat.save();
          }
          deactivatedCount++;
        }
      }
    }
    console.log(`${isDryRun ? '[DRY-RUN] Would deactivate' : 'Deactivated'} ${deactivatedCount} old categories.`);

    // Summary Table
    console.log('\n' + '='.repeat(70));
    console.log(' MIGRATION SUMMARY TABLE');
    console.log('='.repeat(70));
    console.log(
      '#'.padEnd(4) +
      'New Category Name'.padEnd(40) +
      'Products Count'.padStart(15)
    );
    console.log('-'.repeat(70));

    let totalMigrated = 0;
    NEW_CATEGORIES.forEach((catName, index) => {
      const count = countsPerNewCat[catName] || 0;
      totalMigrated += count;
      console.log(
        `${index + 1}.`.padEnd(4) +
        catName.padEnd(40) +
        String(count).padStart(15)
      );
    });

    console.log('-'.repeat(70));
    console.log('TOTAL PRODUCTS MIGRATED'.padEnd(44) + String(totalMigrated).padStart(15));
    console.log('UNMAPPED / SKIPPED'.padEnd(44) + String(unmappedCount).padStart(15));
    console.log('='.repeat(70));

    if (isDryRun) {
      console.log('\n>>> DRY RUN COMPLETE: 0 database modifications were made.');
      console.log('>>> Run WITHOUT --dry-run to apply changes to local MongoDB.');
    } else {
      console.log(`\n>>> SUCCESS: ${updatedCount} products updated to 8 new categories on local DB.`);
      console.log('>>> No product data was deleted. All fields (title, price, description, images) are intact.');
    }

  } catch (error) {
    console.error('Error during category migration:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDatabase disconnected.');
  }
};

main();
