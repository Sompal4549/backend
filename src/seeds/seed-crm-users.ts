import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

async function seed() {
  await mongoose.connect('mongodb://localhost:27017/ensis');
  const db = mongoose.connection.db;
  if (!db) throw new Error('DB connection failed');

  const users = db.collection('users');

  // Enable 2FA for CRM staff accounts
  await users.updateOne(
    { email: 'somfrontenddeveloper@gmail.com' },
    { $set: { isTwoFactorEnabled: true } }
  );

  const hash = await bcrypt.hash('Ensis@123', 10);

  // Upsert Vijay Sharma
  await users.updateOne(
    { email: 'vijay@ensis.in' },
    {
      $set: {
        name: 'Vijay Sharma',
        email: 'vijay@ensis.in',
        password: hash,
        role: 'superadmin',
        isTwoFactorEnabled: true,
        emailVerified: true,
      },
    },
    { upsert: true }
  );

  // Upsert Simran Kaur
  await users.updateOne(
    { email: 'simran@ensis.in' },
    {
      $set: {
        name: 'Simran Kaur',
        email: 'simran@ensis.in',
        password: hash,
        role: 'admin',
        isTwoFactorEnabled: true,
        emailVerified: true,
      },
    },
    { upsert: true }
  );

  console.log('CRM users updated & seeded successfully!');
  await mongoose.disconnect();
}

seed().catch(console.error);
