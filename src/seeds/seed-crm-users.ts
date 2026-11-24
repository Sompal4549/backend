import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function seed() {
  const mongoUri = process.env.MONGO_URI_MAIN;
  if (!mongoUri) {
    throw new Error('MONGO_URI_MAIN environment variable is not set in .env');
  }

  const maskedUri = mongoUri.replace(/:([^@]+)@/, ':****@');
  console.log(`Connecting to MongoDB at: ${maskedUri}`);

  await mongoose.connect(mongoUri, {
    autoIndex: true,
    serverSelectionTimeoutMS: 15000,
  });

  const db = mongoose.connection.db;
  if (!db) throw new Error('DB connection failed');

  const users = db.collection('users');
  const hash = await bcrypt.hash('12345678', 10);

  // Seed CRM superadmin & admin accounts with 2FA enabled
  const accounts = [
    { name: 'Sompal', email: 'somfrontenddeveloper@gmail.com', role: 'superadmin' },
    { name: 'Vijay Sharma', email: 'vijay@ensis.in', role: 'superadmin' },
    { name: 'Simran Kaur', email: 'simran@ensis.in', role: 'admin' },
  ];

  for (const acc of accounts) {
    await users.updateOne(
      { email: acc.email },
      {
        $set: {
          name: acc.name,
          email: acc.email,
          password: hash,
          role: acc.role,
          isTwoFactorEnabled: true,
          emailVerified: true,
          loginAttempts: 0,
          lockUntil: null,
        },
        $unset: {
          twoFactorBackupCodes: '',
        },
      },
      { upsert: true }
    );
    console.log(`✓ Seeded user: ${acc.email} (role: ${acc.role}, 2FA: true)`);
  }

  console.log('CRM users updated & seeded successfully!');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
