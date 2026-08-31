import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { UserModel } from '../models/user.model';
import { LeadModel } from '../models/lead.model';
import { ROLE } from '../constants/roles.constants';
import { refreshAccessToken, logoutUser } from '../services/auth.service';
import { requestEmailOtp, requestWhatsAppOtp, verifyEmailOtp, verifyWhatsAppOtp } from '../services/otp.service';
import { clearRefreshTokenCookie, setRefreshTokenCookie } from '../helpers/cookie.helper';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { config } from '../config/app.config';


export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, phone, addressLine, city, state, country, zipCode } = req.body;

  const nameParts = (name || '').trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const normalizedPhone = phone.replace(/\D/g, '');
  const last10 = normalizedPhone.slice(-10);
  const phoneRegex = new RegExp(`${last10}$`);
  const existingLead = await LeadModel.findOne({ phone: { $regex: phoneRegex } });
  if (existingLead) {
    throw new AppError(409, 'Phone number already registered');
  }

  const lead = await LeadModel.create({
    firstName,
    lastName,
    companyName: '',
    email,
    phone: normalizedPhone,
    phoneCode: '+91',
    leadType: 'Individual',
    leadSource: 'Website',
    leadStatus: 'New',
    priority: 'Medium',
    leadCategory: '',
    addressLine: addressLine || '',
    city: city || '',
    state: state || '',
    country: country || 'India',
    zipCode: zipCode || '',
  });

  const leadIdStr = lead._id.toString();
  const accessToken = jwt.sign({ leadId: leadIdStr, role: 'lead' }, config.jwtAccessSecret, {
    expiresIn: config.accessTokenExpires as jwt.SignOptions['expiresIn'],
  });
  const refreshToken = jwt.sign({ leadId: leadIdStr, role: 'lead' }, config.jwtRefreshSecret, {
    expiresIn: config.refreshTokenExpires as jwt.SignOptions['expiresIn'],
  });

  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  await LeadModel.findByIdAndUpdate(leadIdStr, { refreshToken: hashedRefreshToken });

  setRefreshTokenCookie(res, refreshToken);
  successResponse(res, { lead, accessToken }, 'User registered', 201);
});

// Phone number normalize helper (same as otp.service)
const normalizePhone = (phone: string) => phone.replace(/\D/g, '');

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) {
    throw new AppError(400, 'Phone and OTP are required');
  }

  const normalizedPhone = normalizePhone(phone);

  // Verify OTP with 'login' purpose
  await verifyWhatsAppOtp(normalizedPhone, otp, 'login');

  const last10 = normalizedPhone.slice(-10);
  const phoneRegex = new RegExp(`${last10}$`);

  // Frontend login: always use Lead model
  const lead = await LeadModel.findOne({ phone: { $regex: phoneRegex } }).select('+refreshToken');
  if (!lead) {
    throw new AppError(404, 'User not found. Please register first.');
  }

  const leadIdStr = lead._id.toString();
  const accessToken = jwt.sign({ leadId: leadIdStr, role: 'lead' }, config.jwtAccessSecret, {
    expiresIn: config.accessTokenExpires as jwt.SignOptions['expiresIn'],
  });
  const refreshToken = jwt.sign({ leadId: leadIdStr, role: 'lead' }, config.jwtRefreshSecret, {
    expiresIn: config.refreshTokenExpires as jwt.SignOptions['expiresIn'],
  });

  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  await LeadModel.findByIdAndUpdate(leadIdStr, { refreshToken: hashedRefreshToken });

  setRefreshTokenCookie(res, refreshToken);
  successResponse(res, { lead, accessToken, role: 'lead' }, 'Login successful');
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshTokenValue = req.cookies.refreshToken;
  if (!refreshTokenValue) {
    clearRefreshTokenCookie(res);
    successResponse(res, null, 'Already logged out');
    return;
  }
  const result = await logoutUser(refreshTokenValue, res, ['user']);
  if (result) {
    successResponse(res, null, 'Logged out successfully');
  } else {
    throw new AppError(403, 'Invalid logout context for this role');
  }
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const refreshTokenValue = req.cookies.refreshToken;
  if (!refreshTokenValue) {
    throw new AppError(401, 'Refresh token missing');
  }
  const accessToken = await refreshAccessToken(refreshTokenValue, res);
  successResponse(res, { accessToken }, 'Access token refreshed');
});

export const sendEmailOtp = asyncHandler(async (req: Request, res: Response) => {
  const result = await requestEmailOtp(req.body.email, req.body.purpose, req.body.message);
  successResponse(res, result, 'Email OTP sent');
});

export const confirmEmailOtp = asyncHandler(async (req: Request, res: Response) => {
  const result = await verifyEmailOtp(req.body.email, req.body.otp, req.body.purpose);
  successResponse(res, result, 'Email verified');
});

export const sendWhatsAppOtp = asyncHandler(async (req: Request, res: Response) => {
  const { phone, purpose, message } = req.body;

  // ✅ FIX: Phone normalize karo - OTP service bhi yahi karta hai internally
  const normalizedPhone = normalizePhone(phone);
  let effectivePurpose = purpose || 'login';

  // Agar admin-login hai, toh role check karo with flexible phone matching
  if (purpose === 'admin-login') {
    // DB mein phone kisi bhi format mein ho sakta hai (+91xxx, 91xxx, 0xxx)
    // Last 10 digits se match karte hain — ye India ke liye safest approach hai
    const last10 = normalizedPhone.slice(-10);
    const phoneRegex = new RegExp(`${last10}$`);

    const user = await UserModel.findOne({
      phone: { $regex: phoneRegex },
      role: { $in: [ROLE.ADMIN, ROLE.SUPERADMIN] },
    });

    if (!user) {
      throw new AppError(403, 'Access denied. You are not an admin or credentials do not match.');
    }
    effectivePurpose = 'admin-login';
  }

  // Normalized phone pass karo OTP service ko
  const result = await requestWhatsAppOtp(normalizedPhone, effectivePurpose, message);
  successResponse(res, result, 'WhatsApp OTP sent');
});

export const confirmWhatsAppOtp = asyncHandler(async (req: Request, res: Response) => {
  const { phone, otp, purpose } = req.body;

  // Use the provided purpose directly for verification
  const result = await verifyWhatsAppOtp(phone, otp, purpose || 'verification');
  successResponse(res, result, 'WhatsApp phone verified');
});
