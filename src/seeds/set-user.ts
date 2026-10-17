import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.config';
import { UserModel } from '../models/user.model';
import { ROLE } from '../constants/roles.constants';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function run() {
  await connectDatabase();
  const email = 'somfrontenddeveloper@gmail.com';
  let user = await UserModel.findOne({ email }).select('+password');
  
  if (user) {
    user.name = 'sompal';
    user.password = '12345678';
    user.role = ROLE.SUPERADMIN;
    user.emailVerified = true;
    user.isTwoFactorEnabled = false;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
    console.log('USER_UPDATED:', { id: user._id, email: user.email, name: user.name, role: user.role });
  } else {
    user = new UserModel({
      name: 'sompal',
      email: email,
      password: '12345678',
      role: ROLE.SUPERADMIN,
      emailVerified: true,
      phoneVerified: true,
      isTwoFactorEnabled: false,
      loginAttempts: 0,
    });
    await user.save();
    console.log('USER_CREATED:', { id: user._id, email: user.email, name: user.name, role: user.role });
  }

  const check = await UserModel.findOne({ email }).select('+password');
  if (check) {
    const valid = await check.comparePassword('12345678');
    console.log('PASSWORD_VERIFIED:', valid);
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('ERROR:', err);
  process.exit(1);
});
