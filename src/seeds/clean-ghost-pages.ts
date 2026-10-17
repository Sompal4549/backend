import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.config';
import Page from '../models/page.model';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const cleanup = async () => {
  await connectDatabase();
  console.log('Cleaning up ghost pages without configKey...');

  const result = await Page.deleteMany({
    $or: [{ configKey: null }, { configKey: { $exists: false } }, { configKey: '' }],
  });

  console.log(`Deleted ${result.deletedCount} ghost records.`);

  const remaining = await Page.find({}).sort({ pageName: 1 }).lean();
  console.log(`\nRemaining Canonical Pages (${remaining.length}):`);
  for (const p of remaining) {
    console.log(`- ${p.configKey} | ${p.pageName} (${p.slug}) | ${p.sections?.length || 0} sections`);
  }

  await mongoose.disconnect();
  process.exit(0);
};

cleanup().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
