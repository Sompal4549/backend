import crypto from 'crypto';
import { GenericOtpModel } from '../models/Otp.js';
import { sendEmailOtp } from './email.service.js';
import { sendWhatsAppOTP, WhatsAppOtpContext } from '../utils/whatsapp.js';

const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const generateOTP = (): string => crypto.randomInt(100000, 999999).toString();

export const sendPhoneOtp = async (phone: string, context: WhatsAppOtpContext = 'CONTACT', name: string | null = null) => {
  const otp = generateOTP();
  const identifier = normalizePhone(phone);

  await GenericOtpModel.findOneAndUpdate(
    { identifier, type: 'phone' },
    { identifier, otp, type: 'phone', createdAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const result = await sendWhatsAppOTP(phone, otp, context, name);
  if (!result.success) {
    const error = new Error(result.error);
    (error as any).statusCode = 502;
    throw error;
  }

  return { success: true, message: 'OTP sent to phone' };
};

export const verifyPhoneOtp = async (phone: string, otp: string) => {
  const identifier = normalizePhone(phone);
  const match = await GenericOtpModel.findOne({ identifier, otp, type: 'phone' });

  if (!match) {
    const error = new Error('Invalid or expired OTP');
    (error as any).statusCode = 400;
    throw error;
  }

  await GenericOtpModel.deleteOne({ _id: match._id });
  return { success: true, message: 'Phone OTP verified' };
};

export const sendEmailOtpCode = async (email: string, name?: string | null) => {
  const otp = generateOTP();
  const identifier = normalizeEmail(email);

  await GenericOtpModel.findOneAndUpdate(
    { identifier, type: 'email' },
    { identifier, otp, type: 'email', createdAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await sendEmailOtp(identifier, otp, name ? `Dear ${name}, your IHWE OTP is {{code}}.` : undefined);
  return { success: true, message: 'OTP sent to email' };
};

export const verifyEmailOtpCode = async (email: string, otp: string) => {
  const identifier = normalizeEmail(email);
  const match = await GenericOtpModel.findOne({ identifier, otp, type: 'email' });

  if (!match) {
    const error = new Error('Invalid or expired OTP');
    (error as any).statusCode = 400;
    throw error;
  }

  await GenericOtpModel.deleteOne({ _id: match._id });
  return { success: true, message: 'Email OTP verified' };
};
