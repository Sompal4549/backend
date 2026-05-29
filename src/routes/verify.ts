import { Router, Request, Response } from 'express';
import { sendEmailOtpCode, sendPhoneOtp, verifyEmailOtpCode, verifyPhoneOtp } from '../services/verifyService.js';
import { WhatsAppOtpContext } from '../utils/whatsapp.js';

export const verifyRouter = Router();

verifyRouter.post('/send-phone-otp', async (req: Request, res: Response) => {
  try {
    const { phone, context, name } = req.body as { phone?: string; context?: WhatsAppOtpContext; name?: string };
    if (!phone) {
      res.status(400).json({ success: false, message: 'phone is required' });
      return;
    }
    const result = await sendPhoneOtp(phone, context || 'CONTACT', name || null);
    res.json(result);
  } catch (error) {
    res.status((error as any).statusCode || 500).json({ success: false, error: (error as Error).message });
  }
});

verifyRouter.post('/verify-phone-otp', async (req: Request, res: Response) => {
  try {
    const { phone, otp } = req.body as { phone?: string; otp?: string };
    if (!phone || !otp) {
      res.status(400).json({ success: false, message: 'phone and otp are required' });
      return;
    }
    const result = await verifyPhoneOtp(phone, otp);
    res.json(result);
  } catch (error) {
    res.status((error as any).statusCode || 500).json({ success: false, error: (error as Error).message });
  }
});

verifyRouter.post('/send-email-otp', async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body as { email?: string; name?: string };
    if (!email) {
      res.status(400).json({ success: false, message: 'email is required' });
      return;
    }
    const result = await sendEmailOtpCode(email, name);
    res.json(result);
  } catch (error) {
    res.status((error as any).statusCode || 500).json({ success: false, error: (error as Error).message });
  }
});

verifyRouter.post('/verify-email-otp', async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body as { email?: string; otp?: string };
    if (!email || !otp) {
      res.status(400).json({ success: false, message: 'email and otp are required' });
      return;
    }
    const result = await verifyEmailOtpCode(email, otp);
    res.json(result);
  } catch (error) {
    res.status((error as any).statusCode || 500).json({ success: false, error: (error as Error).message });
  }
});
