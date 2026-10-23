import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { UserModel, UserDocument } from '../models/user.model';
import { ROLE } from '../constants/roles.constants';
import { AppError } from '../utils/app-error';
import { config } from '../config/app.config';

const totpValid = (secret: string | undefined, code: unknown): boolean => {
  const token = String(code ?? '').replace(/\D/g, '');
  if (!secret || token.length !== 6) return false;
  return speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 2 });
};

const formatAdminResponse = (user: UserDocument) => ({
  id: user._id.toString(),
  _id: user._id.toString(),
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  roleSlug: user.role === ROLE.SUPERADMIN ? 'SUPER_ADMIN' : 'ADMIN',
  isTwoFactorEnabled: !!user.isTwoFactorEnabled,
  avatarUrl: user.avatar,
});

export const loginAdminService = async (data: {
  email?: string;
  identifier?: string;
  password?: string;
  totpCode?: string;
}) => {
  const identifier = (data.identifier || data.email || '').trim().toLowerCase();
  const password = data.password || '';

  if (!identifier || !password) {
    throw new AppError(400, 'Identifier and password are required');
  }

  const user = await UserModel.findOne({
    $or: [
      { email: identifier },
      { phone: identifier },
      { employeeId: identifier },
    ],
  }).select('+password +twoFactorSecret +refreshToken');

  if (!user) {
    throw new AppError(401, 'Invalid credentials');
  }

  if (user.isLocked()) {
    throw new AppError(429, 'Account temporarily locked. Too many failed attempts. Try again in 15 minutes.');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    if (user.loginAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
    await user.save();
    throw new AppError(401, 'Invalid credentials');
  }

  // Password matched -> reset failed attempts
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  // If 2FA is enabled
  if (user.isTwoFactorEnabled) {
    // If TOTP code provided with login
    if (data.totpCode) {
      const isValid = totpValid(user.twoFactorSecret, data.totpCode);
      const isBackupCode = user.twoFactorBackupCodes?.includes(data.totpCode.trim().toUpperCase());

      if (!isValid && !isBackupCode) {
        throw new AppError(401, 'Invalid authenticator code');
      }

      if (isBackupCode) {
        user.twoFactorBackupCodes = user.twoFactorBackupCodes?.filter(
          (c) => c !== data.totpCode!.trim().toUpperCase()
        );
        await user.save();
      }
    } else {
      // Require 2FA -> generate short-lived temp token
      const tempToken = jwt.sign(
        { id: user._id.toString(), role: user.role, isTemp2FA: true },
        config.jwtAccessSecret,
        { expiresIn: '5m' }
      );

      return {
        requiresTwoFactor: true,
        twoFactorSetupRequired: false,
        tempToken,
      };
    }
  }

  // Generate tokens
  const accessToken = jwt.sign(
    { userId: user._id.toString(), id: user._id.toString(), role: user.role },
    config.jwtAccessSecret,
    { expiresIn: config.accessTokenExpires as jwt.SignOptions['expiresIn'] }
  );

  const refreshToken = jwt.sign(
    { userId: user._id.toString(), id: user._id.toString(), role: user.role },
    config.jwtRefreshSecret,
    { expiresIn: config.refreshTokenExpires as jwt.SignOptions['expiresIn'] }
  );

  user.refreshToken = await bcrypt.hash(refreshToken, 10);
  await user.save();

  return {
    accessToken,
    refreshToken,
    requiresTwoFactor: false,
    // Admins without an authenticator are sent to the QR setup step right after sign-in
    twoFactorSetupRequired: !user.isTwoFactorEnabled,
    admin: formatAdminResponse(user),
  };
};

export const verify2FAService = async (token: string, tempToken: string) => {
  if (!token || !tempToken) {
    throw new AppError(400, 'Verification token and tempToken are required');
  }

  let decoded: { id: string; isTemp2FA?: boolean };
  try {
    decoded = jwt.verify(tempToken, config.jwtAccessSecret) as { id: string; isTemp2FA?: boolean };
  } catch {
    throw new AppError(401, 'Invalid or expired 2FA verification session');
  }

  const user = await UserModel.findById(decoded.id).select('+twoFactorSecret +refreshToken');
  if (!user) {
    throw new AppError(404, 'Admin account not found');
  }

  const isValid = totpValid(user.twoFactorSecret, token);
  const cleanCode = token.trim().toUpperCase();
  const isBackupCode = user.twoFactorBackupCodes?.includes(cleanCode);

  if (!isValid && !isBackupCode) {
    throw new AppError(401, 'Invalid authenticator code or backup code');
  }

  if (isBackupCode) {
    user.twoFactorBackupCodes = user.twoFactorBackupCodes?.filter((c) => c !== cleanCode);
    await user.save();
  }

  const accessToken = jwt.sign(
    { userId: user._id.toString(), id: user._id.toString(), role: user.role },
    config.jwtAccessSecret,
    { expiresIn: config.accessTokenExpires as jwt.SignOptions['expiresIn'] }
  );

  const refreshToken = jwt.sign(
    { userId: user._id.toString(), id: user._id.toString(), role: user.role },
    config.jwtRefreshSecret,
    { expiresIn: config.refreshTokenExpires as jwt.SignOptions['expiresIn'] }
  );

  user.refreshToken = await bcrypt.hash(refreshToken, 10);
  await user.save();

  return {
    accessToken,
    refreshToken,
    admin: formatAdminResponse(user),
  };
};

export const setup2FAService = async (userId: string) => {
  const user = await UserModel.findById(userId).select('+twoFactorSecret');
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const label = `Ensis Wellness (${user.email})`;
  const issuer = 'Ensis Wellness Spaces';

  // Reuse the pending secret until setup is confirmed: the login page may request
  // setup more than once (effects, reloads), and a new secret each time would
  // invalidate the QR code the admin already scanned.
  let base32 = !user.isTwoFactorEnabled ? user.twoFactorSecret : undefined;
  if (!base32) {
    base32 = speakeasy.generateSecret({ name: label, issuer }).base32;
    user.twoFactorSecret = base32;
    await user.save();
  }

  const otpauthUrl = speakeasy.otpauthURL({ secret: base32, label, issuer, encoding: 'base32' });
  const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

  return {
    secret: base32,
    manualKey: base32,
    provisioningUri: otpauthUrl,
    otpauthUrl,
    qrCode: qrCodeDataUrl,
  };
};

export const confirm2FAService = async (userId: string, token: string) => {
  const user = await UserModel.findById(userId).select('+twoFactorSecret');
  if (!user || !user.twoFactorSecret) {
    throw new AppError(400, '2FA setup was not initiated');
  }

  const isValid = totpValid(user.twoFactorSecret, token);
  if (!isValid) {
    throw new AppError(400, 'Invalid 6-digit code. Check your authenticator app and try again.');
  }

  // Generate 8 random backup codes
  const backupCodes: string[] = [];
  for (let i = 0; i < 8; i++) {
    backupCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }

  user.isTwoFactorEnabled = true;
  user.twoFactorBackupCodes = backupCodes;
  await user.save();

  return {
    isTwoFactorEnabled: true,
    backupCodes,
    message: 'Two-factor authentication successfully enabled',
  };
};

export const changePasswordService = async (userId: string, currentPassword: string, newPassword: string) => {
  if (!currentPassword || !newPassword) {
    throw new AppError(400, 'Current and new password are required');
  }
  if (newPassword.length < 8) {
    throw new AppError(400, 'New password must be at least 8 characters');
  }
  if (newPassword === currentPassword) {
    throw new AppError(400, 'New password must be different from the current password');
  }

  const user = await UserModel.findById(userId).select('+password +refreshToken');
  if (!user || ![ROLE.ADMIN, ROLE.SUPERADMIN].includes(user.role as typeof ROLE.ADMIN)) {
    throw new AppError(404, 'Admin user not found');
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new AppError(400, 'Current password is incorrect');
  }

  // Hashed by the model's pre('save') hook; clearing the refresh token signs out other sessions
  user.password = newPassword;
  user.refreshToken = undefined;
  await user.save();

  return { success: true, message: 'Password changed successfully. Please sign in again.' };
};
