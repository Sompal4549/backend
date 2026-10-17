import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const uri = process.env.MONGO_URI_MAIN || 'mongodb://localhost:27017/ensis';

async function seedSompa() {
  await mongoose.connect(uri);
  console.log('Connected to MongoDB at', uri);

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection failed');
  }
  const usersCollection = db.collection('users');

  const name = 'sompa';
  const email = 'somfrontenddeveloper@gmail.com'.toLowerCase().trim();
  const phone = '7678221037';
  const plainPassword = '12345678';
  const role = 'superadmin';

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const existing = await usersCollection.findOne({
    $or: [{ email }, { phone }],
  });

  if (existing) {
    await usersCollection.updateOne(
      { _id: existing._id },
      {
        $set: {
          name,
          email,
          phone,
          password: hashedPassword,
          role,
          emailVerified: true,
          phoneVerified: true,
          updatedAt: new Date(),
        },
      }
    );
    console.log('Updated existing user:', existing._id.toString());
  } else {
    const res = await usersCollection.insertOne({
      name,
      email,
      phone,
      password: hashedPassword,
      role,
      emailVerified: true,
      phoneVerified: true,
      wishlist: [],
      orders: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('Created new user with id:', res.insertedId.toString());
  }

  const verifiedUser = await usersCollection.findOne({ email });
  if (verifiedUser) {
    console.log('Verified user in DB:');
    console.log('  Name:', verifiedUser.name);
    console.log('  Email:', verifiedUser.email);
    console.log('  Phone:', verifiedUser.phone);
    console.log('  Role:', verifiedUser.role);

    const match = await bcrypt.compare(plainPassword, verifiedUser.password);
    console.log('  Password check (12345678):', match ? 'VALID' : 'INVALID');
  }

  await mongoose.disconnect();
}

seedSompa().catch((err) => {
  console.error('Seed Error:', err);
  process.exit(1);
});
