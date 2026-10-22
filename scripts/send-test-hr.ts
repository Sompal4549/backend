import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
import mongoose from 'mongoose';
import { sendHrNotificationEmail } from '../src/services/career-email.service';
import { CareerApplicationModel } from '../src/models/career-application.model';
import { CareerModel } from '../src/models/career.model';

async function main() {
  const uri = process.env.MONGO_URI_MAIN || process.env.MONGO_URI_LOCAL;
  await mongoose.connect(uri!);
  const app = await CareerApplicationModel.findOne({}).sort({ createdAt: -1 }).lean() as any;
  const job = await CareerModel.findById(app.jobId).lean() as any;
  console.log('Sending HR email for', app.applicationId, '...');
  await sendHrNotificationEmail(app, job || { title: app.jobTitle });
  console.log('DONE — HR email sent. Check inbox/spam of somfrontenddeveloper@gmail.com');
  await mongoose.disconnect();
}
main().catch((e) => { console.error('FAILED:', e); process.exit(1); });
