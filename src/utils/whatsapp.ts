import dotenv from 'dotenv';
import path from 'path';
import { WhatsAppLog } from '../models/WhatsAppLog.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export type WhatsAppOtpContext =
  | 'CONTACT'
  | 'VISITOR'
  | 'EXHIBITOR'
  | 'BUYER'
  | 'DELEGATE'
  | 'SELLER'
  | 'SPONSOR'
  | 'EXPO_SUPPORT';

const allowedContexts: WhatsAppOtpContext[] = [
  'CONTACT',
  'VISITOR',
  'EXHIBITOR',
  'BUYER',
  'DELEGATE',
  'SELLER',
  'SPONSOR',
  'EXPO_SUPPORT',
];

const contextLabels: Record<WhatsAppOtpContext, string> = {
  CONTACT: 'contact verification',
  VISITOR: 'visitor verification',
  EXHIBITOR: 'exhibitor verification',
  BUYER: 'buyer verification',
  DELEGATE: 'delegate verification',
  SELLER: 'seller verification',
  SPONSOR: 'sponsor verification',
  EXPO_SUPPORT: 'expo support verification',
};

const timeoutMs = 15000;

const normalizeMobile = (mobile: string): string => {
  const digits = String(mobile || '').replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
};

const buildOtpMessage = (otp: string, context: WhatsAppOtpContext, name: string | null): string => {
  const displayName = name || 'User';
  return `Dear ${displayName}, ${otp} is your OTP for IHWE ${contextLabels[context]}. It is valid for 5 minutes. Please do not share it with anyone.`;
};

const readResponseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text().catch(() => '');
  if (!text) return '';
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const logWhatsAppAttempt = async (
  recipient: string,
  message: string,
  name: string | null,
  status: 'success' | 'failed',
  error?: string
) => {
  try {
    await WhatsAppLog.create({
      recipient,
      message,
      name: name || undefined,
      status,
      error,
    });
  } catch (logError) {
    console.error('Failed to write WhatsAppLog:', (logError as Error).message);
  }
};

const sendViaOpus = async (mobile: string, msg: string, name: string | null) => {
  const formattedMobile = normalizeMobile(mobile);
  const apiKeyExists = Boolean(process.env.OPUS_API_KEY);

  console.info('OPUS_API_KEY exists:', apiKeyExists);
  console.info('Formatted WhatsApp mobile:', formattedMobile);

  if (!apiKeyExists) {
    const error = 'OPUS_API_KEY is missing';
    await logWhatsAppAttempt(formattedMobile, msg, name, 'failed', error);
    return { success: false, error };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `https://api.opustechnology.in/wapp/v2/api/send?apikey=${process.env.OPUS_API_KEY}&mobile=${formattedMobile}&msg=${encodeURIComponent(msg)}`;
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    const body = await readResponseBody(response);
    console.info('OPUS response status:', response.status);
    console.info('OPUS response body:', body);

    const data = { status: response.status, body };
    if (!response.ok) {
      const error = `OPUS request failed with status ${response.status}`;
      await logWhatsAppAttempt(formattedMobile, msg, name, 'failed', error);
      return { success: false, error };
    }

    await logWhatsAppAttempt(formattedMobile, msg, name, 'success');
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError' ? 'OPUS request timed out' : (error as Error).message;
    console.error('OPUS WhatsApp error:', message);
    await logWhatsAppAttempt(formattedMobile, msg, name, 'failed', message);
    return { success: false, error: message };
  } finally {
    clearTimeout(timeout);
  }
};

export const sendWhatsAppOTP = async (
  mobile: string,
  otp: string,
  context: WhatsAppOtpContext = 'CONTACT',
  name: string | null = null
) => {
  const safeContext = allowedContexts.includes(context) ? context : 'CONTACT';
  const msg = buildOtpMessage(otp, safeContext, name);
  return sendViaOpus(mobile, msg, name);
};

export const sendWhatsAppMessage = async (mobile: string, msg: string, name: string | null = null) => {
  return sendViaOpus(mobile, msg, name);
};
