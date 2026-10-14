import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.config';
import { UserModel, UserDocument } from '../models/user.model';
import { ROLE } from '../constants/roles.constants';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const DEFAULT_ADMIN = {
  name: 'Ensis Administrator',
  email: 'admin@ensis.in',
  phone: '9876543210',
  password: 'admin123',
  role: ROLE.SUPERADMIN,
};

/**
 * Ensures the default Ensis admin exists in the target database.
 * Password goes through the model's pre('save') bcrypt hook — never stored in plain text.
 */
export const seedAdmin = async (): Promise<UserDocument> => {
  const filter = {
    $or: [{ phone: DEFAULT_ADMIN.phone }, { email: DEFAULT_ADMIN.email }],
  };

  const existing = await UserModel.findOne(filter);

  if (existing) {
    existing.name = DEFAULT_ADMIN.name;
    existing.email = DEFAULT_ADMIN.email;
    existing.phone = DEFAULT_ADMIN.phone;
    existing.role = DEFAULT_ADMIN.role;
    existing.password = DEFAULT_ADMIN.password;
    existing.emailVerified = true;
    existing.phoneVerified = true;
    await existing.save();
    return existing;
  }

  return UserModel.create({
    name: DEFAULT_ADMIN.name,
    email: DEFAULT_ADMIN.email,
    phone: DEFAULT_ADMIN.phone,
    password: DEFAULT_ADMIN.password,
    role: DEFAULT_ADMIN.role,
    emailVerified: true,
    phoneVerified: true,
    wishlist: [],
    orders: [],
  });
};

const main = async () => {
  console.log('Connecting to MongoDB...');
  await connectDatabase();

  const dbName = mongoose.connection.name;
  if (dbName !== 'ensis') {
    console.warn(`Warning: active database is "${dbName}", not "ensis". Check MONGO_URI in .env.`);
  }

  const admin = await seedAdmin();

  const total = await UserModel.countDocuments({ role: { $in: [ROLE.ADMIN, ROLE.SUPERADMIN] } });
  console.log('\nADMIN SEED COMPLETE');
  console.log(`  Database : ${dbName}`);
  console.log(`  Name     : ${admin.name}`);
  console.log(`  Email    : ${admin.email}`);
  console.log(`  Phone    : ${admin.phone}`);
  console.log(`  Role     : ${admin.role}`);
  console.log(`  Admin users in DB: ${total}`);
  console.log('\nVerify with:');
  console.log("  curl -X POST http://localhost:5000/api/v1/admin/login/dev -H \"Content-Type: application/json\" -d '{\"phone\":\"9876543210\"}'");

  await mongoose.disconnect();
  process.exit(0);
};

main().catch((error) => {
  console.error('\nADMIN SEED FAILED:', error instanceof Error ? error.message : error);
  process.exit(1);
});
