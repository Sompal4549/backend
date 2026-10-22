import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
import mongoose from 'mongoose';
import { getOrCreateCareerSettings } from '../src/models/career-settings.model';
import { CareerApplicationModel } from '../src/models/career-application.model';

async function main() {
  const uri = process.env.MONGO_URI_MAIN || process.env.MONGO_URI_LOCAL;
  await mongoose.connect(uri!);
  const settings = await getOrCreateCareerSettings();
  console.log('hrEmails =', JSON.stringify(settings.hrEmails));
  console.log('hrContact =', JSON.stringify(settings.hrContact));
  const apps = await CareerApplicationModel.find({}).sort({ createdAt: -1 }).limit(3).lean() as any[];
  for (const a of apps) {
    console.log('APP:', a.applicationId, '| status:', a.status, '| email:', a.profile?.email || a.email, '| createdAt:', a.createdAt);
  }
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
