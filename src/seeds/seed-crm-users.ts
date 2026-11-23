import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

async function seed() {
  await mongoose.connect('mongodb://localhost:27017/ensis');
  const db = mongoose.connection.db;
  if (!db) throw new Error('DB connection failed');

  const users = db.collection('users');

  const hash = await bcrypt.hash('12345678', 10);

  // Upsert Sompal
  await users.updateOne(
    { email: 'somfrontenddeveloper@gmail.com' },
    {
      $set: {
        name: 'Sompal',
        email: 'somfrontenddeveloper@gmail.com',
        password: hash,
        role: 'superadmin',
        isTwoFactorEnabled: false,
        twoFactorBackupCodes: ['12345678', '123456', 'ENSIS123'],
        emailVerified: true,
        loginAttempts: 0,
        lockUntil: null,
      },
    },
    { upsert: true }
  );

  // Upsert Vijay Sharma
  await users.updateOne(
    { email: 'vijay@ensis.in' },
    {
      $set: {
        name: 'Vijay Sharma',
        email: 'vijay@ensis.in',
        password: hash,
        role: 'superadmin',
        isTwoFactorEnabled: false,
        twoFactorBackupCodes: ['12345678', '123456', 'ENSIS123'],
        emailVerified: true,
        loginAttempts: 0,
        lockUntil: null,
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
        isTwoFactorEnabled: false,
        twoFactorBackupCodes: ['12345678', '123456', 'ENSIS123'],
        emailVerified: true,
        loginAttempts: 0,
        lockUntil: null,
      },
    },
    { upsert: true }
  );

  console.log('CRM users updated & seeded successfully!');
  await mongoose.disconnect();
}

seed().catch(console.error);
