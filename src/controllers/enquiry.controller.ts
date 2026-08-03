import { Request, Response } from 'express';
import { createEnquiry } from '../repositories/enquiry.repository';
import { uploadImage } from '../helpers/image.helper';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { sendEmail } from '../services/email.service';
import { sendWhatsAppMessage } from '../utils/whatsapp';

export const submitEnquiry = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;
  let attachmentUrl = '';

  if (file) {
    const uploadResult = await uploadImage(file.buffer, 'enquiry');
    attachmentUrl = uploadResult.url;
  }

  const rawBody = { ...(req.body || {}) };
  const servicesRequired = Array.isArray(rawBody.servicesRequired)
    ? rawBody.servicesRequired
    : typeof rawBody.servicesRequired === 'string'
      ? JSON.parse(rawBody.servicesRequired)
      : [];

  const cityAndState = typeof rawBody.cityAndState === 'string' ? rawBody.cityAndState.trim() : '';
  const splitLocation = cityAndState
    ? cityAndState.split(',').map((part) => part.trim()).filter(Boolean)
    : [];

  const enquiryData = {
    ...rawBody,
    attachmentUrl,
    companyOrganization: rawBody.companyOrganization || '',
    cityAndState: undefined,
    state: rawBody.state || (splitLocation[1] ?? ''),
    city: rawBody.city || (splitLocation[0] ?? ''),
    servicesRequired,
    preferredContact: rawBody.preferredContact || 'whatsapp',
    agreeToContact: rawBody.agreeToContact === true || rawBody.agreeToContact === 'true',
  };

  const enquiry = await createEnquiry(enquiryData);

  // 1. Inform Client via Email
  const emailSubject = 'Enquiry Received - Ensis Wellness';
  const emailText = `Hello ${enquiry.fullName},\n\nThank you for reaching out to Ensis Wellness. We have received your enquiry regarding ${enquiry.projectType} and our team will get back to you shortly.\n\nRegards,\nThe Ensis Team`;
  const emailHtml = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #2c3e50;">Enquiry Received</h2>
      <p>Hello <strong>${enquiry.fullName}</strong>,</p>
      <p>Thank you for reaching out to <strong>Ensis Wellness</strong>.</p>
      <p>We have successfully received your enquiry for <strong>${enquiry.projectType}</strong>. Our experts are currently reviewing your requirements and will contact you via your preferred method (${enquiry.preferredContact}) shortly.</p>
      <hr/>
      <p style="font-size: 0.9em; color: #7f8c8d;">This is an automated confirmation.</p>
      <p>Regards,<br/><strong>The Ensis Team</strong></p>
    </div>
  `;
  sendEmail(enquiry.email, emailSubject, emailText, emailHtml).catch(err =>
    console.error(`[Enquiry Email Error] To: ${enquiry.email} | ${err.message}`)
  );

  // 2. Inform Client via WhatsApp
  let whatsappPhone = String(enquiry.mobileNumber).replace(/\D/g, '');
  if (whatsappPhone.length === 10) whatsappPhone = '91' + whatsappPhone;

  const whatsappMsg = `*Enquiry Received!* \n\nHello ${enquiry.fullName},\n\nThank you for reaching out to Ensis Wellness. We have received your request for *${enquiry.projectType}*. Our team will get in touch with you shortly.\n\nRegards,\nEnsis Team`;
  sendWhatsAppMessage(whatsappPhone, whatsappMsg, enquiry.fullName).catch(err =>
    console.error(`[Enquiry WhatsApp Error] To: ${enquiry.mobileNumber} | ${err.message}`)
  );

  successResponse(res, enquiry, 'Enquiry submitted successfully', 201);
});
