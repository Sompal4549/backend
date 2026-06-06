import { Request, Response } from 'express';
import { GenericOtpModel } from '../models/Otp.ts';
import { sendEmailOtp } from '../services/email.service.ts';
import { generateOTP } from '../services/verifyService.ts';
import * as whatsapp from '../utils/whatsapp.ts';

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
      res.status(400).json({ success: false, message: 'identifier and valid type are required' });
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
        res.status(502).json({ success: false, error: result.error });
        return;
      }
    }

    if (otpType === 'email') {
      await sendEmailOtp(normalizedIdentifier, otpCode);
    }

    res.json({ success: true, message: `OTP sent to ${otpType}` });
  } catch (error) {
    res.status((error as any).statusCode || 500).json({ success: false, error: (error as Error).message });
  }
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, otp, type } = req.body as { identifier?: string; otp?: string; type?: 'email' | 'phone' };

    if (!identifier || !otp || !['email', 'phone'].includes(type || '')) {
      res.status(400).json({ success: false, message: 'identifier, otp, and valid type are required' });
      return;
    }

    const otpType = type as 'email' | 'phone';
    const normalizedIdentifier = normalizeIdentifier(identifier, otpType);
    const match = await GenericOtpModel.findOne({ identifier: normalizedIdentifier, otp, type: otpType });

    if (!match) {
      res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      return;
    }

    await GenericOtpModel.deleteOne({ _id: match._id });
    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    res.status((error as any).statusCode || 500).json({ success: false, error: (error as Error).message });
  }
};
