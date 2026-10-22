/* Quick diagnostic: send a test HR + candidate email using the real service */
import mongoose from 'mongoose';
import { config } from '../src/config/app.config';
import { sendEmail } from '../src/services/email.service';
import {
  sendCandidateConfirmationEmail,
  sendHrNotificationEmail,
} from '../src/services/career-email.service';
import { CareerApplicationModel } from '../src/models/career-application.model';
import { CareerModel } from '../src/models/career.model';

async function main() {
  console.log('emailProvider =', config.emailProvider);
  console.log('smtpHost =', config.smtpHost || '(empty)');
  console.log('smtpPort =', config.smtpPort);
  console.log('smtpUser set =', Boolean(config.smtpUser));
  console.log('smtpPass set =', Boolean(config.smtpPass));
  console.log('emailFrom =', config.emailFrom);

  // 1) raw SMTP test
  try {
    await sendEmail(
      'somfrontenddeveloper@gmail.com',
      '[TEST] ENSIS SMTP connectivity check',
      'If you receive this, SMTP is working.'
    );
    console.log('RAW SMTP TEST: OK');
  } catch (err) {
    console.error('RAW SMTP TEST FAILED:', (err as Error).message);
  }

  // 2) use the latest real application from DB if available
  const uri = process.env.MONGO_URI_MAIN || process.env.MONGO_URI_LOCAL || process.env.MONGODB_URI;
  if (!uri) {
    console.log('No MONGODB_URI in env — skipping DB-backed test.');
    return;
  }
  await mongoose.connect(uri);
  const app = await CareerApplicationModel.findOne({}).sort({ createdAt: -1 }).lean() as any;
  if (!app) {
    console.log('No applications in DB — skipping template test.');
    await mongoose.disconnect();
    return;
  }
  const job = await CareerModel.findById(app.jobId).lean() as any;
  console.log('Testing with application:', app.applicationId, '| job:', job?.title || app.jobTitle);

  try {
    await sendHrNotificationEmail(app, job || { title: app.jobTitle });
    console.log('HR EMAIL: OK');
  } catch (err) {
    console.error('HR EMAIL FAILED:', (err as Error).message);
  }

  try {
    await sendCandidateConfirmationEmail(app, job || { title: app.jobTitle });
    console.log('CANDIDATE EMAIL: OK');
  } catch (err) {
    console.error('CANDIDATE EMAIL FAILED:', (err as Error).message);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('SCRIPT ERROR:', err);
  process.exit(1);
});
