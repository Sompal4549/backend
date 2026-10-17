import { Request, Response } from 'express';
import { GenericOtpModel } from '../models/Otp';
import { sendEmailOtp } from '../services/email.service';
import { generateOTP } from '../services/verifyService';
import * as whatsapp from '../utils/whatsapp';
import { successResponse } from '../utils/api-response';

const normalizeIdentifier = (identifier: string, type: 'email' | 'phone') => {
  return type === 'email' ? identifier.trim().toLowerCase() : identifier.replace(/\D/g, '');
};

export const requestOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, type, name, source } = req.body as {
      identifier?: string;
      type?: 'email' | 'phone';
      name?: string;
      source?: whatsapp.WhatsAppOtpContext;
    };

    if (!identifier || !['email', 'phone'].includes(type || '')) {
      successResponse(res, null, 'identifier and valid type are required', 400);
      return;
    }

    const otpType = type as 'email' | 'phone';
    const otpCode = generateOTP();
    const normalizedIdentifier = normalizeIdentifier(identifier, otpType);

    await GenericOtpModel.findOneAndUpdate(
      { identifier: normalizedIdentifier, type: otpType },
      { identifier: normalizedIdentifier, otp: otpCode, type: otpType, createdAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (otpType === 'phone') {
      const result = await whatsapp.sendWhatsAppOTP(identifier, otpCode, source || 'BUYER', name || 'User');
      if (!result.success) {
        successResponse(res, null, `Failed to send OTP: ${result.error}`, 502);
        return;
      }
    }

    if (otpType === 'email') {
      await sendEmailOtp(normalizedIdentifier, otpCode);
    }

    successResponse(res, { sentTo: otpType }, `OTP sent to ${otpType}`);
  } catch (error) {
    successResponse(res, null, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, otp, type } = req.body as { identifier?: string; otp?: string; type?: 'email' | 'phone' };

    if (!identifier || !otp || !['email', 'phone'].includes(type || '')) {
      successResponse(res, null, 'identifier, otp, and valid type are required', 400);
      return;
    }

    const otpType = type as 'email' | 'phone';
    const normalizedIdentifier = normalizeIdentifier(identifier, otpType);
    const match = await GenericOtpModel.findOne({ identifier: normalizedIdentifier, otp, type: otpType });

    if (!match) {
      successResponse(res, null, 'Invalid or expired OTP', 400);
      return;
    }

    await GenericOtpModel.deleteOne({ _id: match._id });
    successResponse(res, { verified: true, type: otpType }, 'OTP verified successfully');
  } catch (error) {
    successResponse(res, null, (error as Error).message, (error as any).statusCode || 500);
  }
};
