import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { config } from '../config/app.config';
import { OtpModel, OTP_CHANNEL } from '../models/otp.model';
import { sendEmailOtp } from './email.service';
import { sendWhatsAppOtp } from './whatsapp.service';
import { markUserEmailVerified, markUserPhoneVerified } from '../repositories/user.repository';
import { AppError } from '../utils/app-error';

type OtpChannel = typeof OTP_CHANNEL[keyof typeof OTP_CHANNEL];

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const normalizePhone = (phone: string) => phone.replace(/\D/g, '');

const generateOtp = () => {
  const length = Math.max(config.otpLength, 4);
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return crypto.randomInt(min, max).toString();
};

const getTarget = (channel: OtpChannel, target: string) => {
  return channel === OTP_CHANNEL.EMAIL ? normalizeEmail(target) : normalizePhone(target);
};

const sendOtp = async (channel: OtpChannel, target: string, code: string, message?: string) => {
  if (channel === OTP_CHANNEL.EMAIL) {
    await sendEmailOtp(target, code, message);
    return;
  }
  await sendWhatsAppOtp(target, code, message);
};

export const requestOtp = async (channel: OtpChannel, rawTarget: string, purpose = 'verification', message?: string) => {
  const target = getTarget(channel, rawTarget);
  const windowStart = new Date(Date.now() - config.otpResendWindowMinutes * 60 * 1000);
  const recentCount = await OtpModel.countDocuments({
    channel,
    target,
    purpose,
    createdAt: { $gte: windowStart },
  });

  if (recentCount >= config.otpResendLimit) {
    throw new AppError(429, 'OTP retry limit reached. Please try again later.');
  }

  await OtpModel.updateMany({ channel, target, purpose, consumedAt: { $exists: false } }, { consumedAt: new Date() });
  const code = generateOtp();
  await OtpModel.create({
    channel,
    target,
    purpose,
    codeHash: await bcrypt.hash(code, 10),
    expiresAt: new Date(Date.now() + config.otpExpiresMinutes * 60 * 1000),
    maxAttempts: config.otpMaxVerifyAttempts,
  });
  await sendOtp(channel, target, code, message);
  return { channel, target, expiresInMinutes: config.otpExpiresMinutes };
};

export const verifyOtp = async (channel: OtpChannel, rawTarget: string, code: string, purpose = 'verification') => {
  const target = getTarget(channel, rawTarget);
  const otp = await OtpModel.findOne({
    channel,
    target,
    purpose,
    consumedAt: { $exists: false },
  })
    .sort({ createdAt: -1 })
    .select('+codeHash');

  if (!otp) {
    throw new AppError(400, 'OTP not found or already used');
  }
  if (otp.expiresAt.getTime() < Date.now()) {
    otp.consumedAt = new Date();
    await otp.save();
    throw new AppError(400, 'OTP expired');
  }
  if (otp.attempts >= otp.maxAttempts) {
    throw new AppError(429, 'OTP verification attempts exceeded');
  }

  const isValid = await bcrypt.compare(code, otp.codeHash);
  if (!isValid) {
    otp.attempts += 1;
    await otp.save();
    throw new AppError(400, 'Invalid OTP');
  }

  otp.consumedAt = new Date();
  await otp.save();
  let user = null;
  if (purpose === 'verification') {
    user = channel === OTP_CHANNEL.EMAIL ? await markUserEmailVerified(target) : await markUserPhoneVerified(target);
  }
  return { channel, target, verified: true, user };
};

export const requestEmailOtp = (email: string, purpose?: string, message?: string) =>
  requestOtp(OTP_CHANNEL.EMAIL, email, purpose, message);
export const requestWhatsAppOtp = (phone: string, purpose?: string, message?: string) =>
  requestOtp(OTP_CHANNEL.WHATSAPP, phone, purpose, message);
export const verifyEmailOtp = (email: string, code: string, purpose?: string) => verifyOtp(OTP_CHANNEL.EMAIL, email, code, purpose);
export const verifyWhatsAppOtp = (phone: string, code: string, purpose?: string) =>
  verifyOtp(OTP_CHANNEL.WHATSAPP, phone, code, purpose);
