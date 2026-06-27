/**
 * One-time migration script: DB mein saare phone numbers normalize karo
 * Run: npx ts-node src/scripts/normalize-phones.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGO_URI = process.env.MONGO_URI_MAIN || process.env.MONGO_URI || 'mongodb://localhost:27017/ensis';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db!;
  const users = db.collection('users');

  const allUsers = await users.find({ phone: { $exists: true, $ne: null } }).toArray();
  console.log(`Found ${allUsers.length} users with phone`);

  let updated = 0;
  for (const user of allUsers) {
    const original = user.phone as string;
    const normalized = original.replace(/\D/g, '');
    if (original !== normalized) {
      await users.updateOne({ _id: user._id }, { $set: { phone: normalized } });
      console.log(`  Updated: "${original}" -> "${normalized}"`);
      updated++;
    }
  }

  console.log(`Done. ${updated} phones normalized.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
