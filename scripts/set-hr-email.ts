import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
import mongoose from 'mongoose';
import { getOrCreateCareerSettings, CareerSettingsModel } from '../src/models/career-settings.model';

async function main() {
  const uri = process.env.MONGO_URI_MAIN || process.env.MONGO_URI_LOCAL;
  await mongoose.connect(uri!);
  const settings = await getOrCreateCareerSettings();
  const newEmail = 'somfrontenddeveloper@gmail.com';
  const list = Array.isArray(settings.hrEmails) ? [...settings.hrEmails] : [];
  if (!list.includes(newEmail)) list.push(newEmail);
  await CareerSettingsModel.updateOne({ _id: settings._id }, { $set: { hrEmails: list } });
  const updated = await getOrCreateCareerSettings();
  console.log('Updated hrEmails =', JSON.stringify(updated.hrEmails));
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
