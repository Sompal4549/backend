import { seedPagesAndCms } from './pages.seed';
import { connectDatabase } from '../config/database.config';
import mongoose from 'mongoose';

const run = async () => {
  console.log('Connecting to MongoDB...');
  await connectDatabase();
  const dbName = mongoose.connection.name;
  console.log(`Connected to database: "${dbName}"`);

  const result = await seedPagesAndCms();
  console.log('\n=== ENSIS PAGES & CMS SEED COMPLETED ===');
  console.log(`Pages Created: ${result.createdPages}, Updated: ${result.updatedPages}, Total: ${result.totalConfigKeys}`);

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
