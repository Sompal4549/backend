import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app';
import { UserModel } from '../src/models/user.model';
import { LeadModel } from '../src/models/lead.model';
import { config } from '../src/config/app.config';
import bcrypt from 'bcrypt';

export const app = createApp();

export const createTestAdmin = async (email = 'admin-test@ensis.in') => {
  await UserModel.deleteMany({ email });
  const user = await UserModel.create({
    name: 'Test SuperAdmin',
    email,
    password: 'Admin@123456', // userSchema pre-save hook will hash this
    role: 'superadmin',
    isVerified: true,
  });

  const token = jwt.sign(
    { userId: user._id.toString(), role: user.role },
    config.jwtAccessSecret || 'test-jwt-access-secret-32-chars-ok!',
    { expiresIn: '1h' }
  );

  return { user, token };
};

export const createTestLead = async (email = 'lead-test@ensis.in', phone = '9876543210') => {
  await LeadModel.deleteMany({ $or: [{ email }, { phone }] });
  const { user } = await createTestAdmin('assignee@ensis.in');

  const today = new Date().toISOString().slice(0, 10);
  const lead = await LeadModel.create({
    firstName: 'Test',
    lastName: 'Lead',
    companyName: 'Test Wellness Inc',
    email,
    officialEmail: email,
    phone,
    title: 'Mr.',
    typeOfBusiness: 'Wellness Clinic',
    industrySector: 'Ayurveda',
    leadSource: 'Website',
    leadStatus: 'New',
    priority: 'High',
    assignedTo: user._id,
    eventAttribution: 'Website Direct',
    leadDate: today,
    followUpDate: today,
    addressLine: '123 Therapy Lane',
    city: 'New Delhi',
    state: 'Delhi',
    country: 'India',
    zipCode: '110001',
  });

  const token = jwt.sign(
    { leadId: lead._id.toString(), role: 'lead' },
    config.jwtAccessSecret || 'test-jwt-access-secret-32-chars-ok!',
    { expiresIn: '1h' }
  );

  return { lead, token };
};
