import { Request, Response } from 'express';
import {
  createEnquiry,
  getEnquiryPaginated,
  exportAllEnquiries,
  updateEnquiryById,
} from '../repositories/enquiry.repository';
import { uploadImage } from '../helpers/image.helper';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { IEnquiry } from '../models/enquiry.model';
import { sendEmail } from '../services/email.service';
import { sendWhatsAppMessage } from '../utils/whatsapp';

/** Website forms that post here (see EnquaryBannerAndForm, ContactSection, Products) */
const ENQUIRY_SOURCES = ['enquiry', 'contact', 'products'];

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
    ? cityAndState.split(',').map((part: string) => part.trim()).filter(Boolean)
    : [];

  const enquiryData = {
    ...rawBody,
    attachmentUrl,
    companyOrganization: rawBody.companyOrganization || '',
    cityAndState: undefined,
    state: rawBody.state || (splitLocation[1] ?? ''),
    city: rawBody.city || (splitLocation[0] ?? ''),
    pincode: rawBody.pincode || rawBody.zipcode || '',
    alternatePhone: rawBody.alternatePhone || '',
    subject: rawBody.subject || '',
    servicesRequired,
    preferredContact: rawBody.preferredContact || 'whatsapp',
    source: ENQUIRY_SOURCES.includes(rawBody.source) ? rawBody.source : 'other',
    // Never trusted from the public form
    status: undefined,
    isRead: undefined,
    notes: undefined,
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

export const getEnquiryPipeline = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '20', status, search } = req.query;
  const result = await getEnquiryPaginated({
    page: Number(page),
    limit: Number(limit),
    status: status as string,
    search: search as string,
  });
  successResponse(res, result, 'Enquiries retrieved');
});

export const updateEnquiryStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, notes, isRead } = req.body;

  const update: Partial<IEnquiry> = {};

  if (status !== undefined) {
    const validStatuses = ['pending', 'contacted', 'resolved', 'cancelled', 'closed', 'new', 'qualified'];
    if (!validStatuses.includes(status as string)) {
      throw new AppError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
    update.status = status;
  }

  if (notes !== undefined) update.notes = notes;
  if (isRead !== undefined) update.isRead = Boolean(isRead);

  if (Object.keys(update).length === 0) {
    throw new AppError(400, 'Nothing to update.');
  }

  const enquiry = await updateEnquiryById(id, update);
  if (!enquiry) {
    throw new AppError(404, 'Enquiry not found');
  }
  successResponse(res, enquiry, 'Enquiry updated');
});

export const exportEnquiries = asyncHandler(async (_req: Request, res: Response) => {
  const enquiries = await exportAllEnquiries();
  successResponse(res, enquiries, 'Enquiries exported');
});
