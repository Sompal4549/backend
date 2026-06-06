import { sendWhatsAppOTP, sendWhatsAppMessage } from '../utils/whatsapp.js';

export const sendWhatsAppOtp = async (phone: string, otp: string, customMessage?: string): Promise<void> => {
  const result = customMessage
    ? await sendWhatsAppMessage(
        phone,
        customMessage.includes('{{code}}') ? customMessage.split('{{code}}').join(otp) : `${customMessage}\n\nOTP: ${otp}`
      )
    : await sendWhatsAppOTP(phone, otp);
  if (!result.success) throw new Error(result.error);
};
