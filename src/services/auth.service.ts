import { IUser } from '../models/user.model';
import { LeadModel } from '../models/lead.model';
import { createUser, findUserByEmail, updateUserRefreshToken, findUserById } from '../repositories/user.repository';
import { createAccessToken, createRefreshToken, verifyRefreshToken } from '../utils/jwt.utils';
import { setRefreshTokenCookie, clearRefreshTokenCookie } from '../helpers/cookie.helper';
import bcrypt from 'bcrypt';
import { ROLE } from '../constants/roles.constants';
import { AppError } from '../utils/app-error';

export const toAuthUser = (user: any) => {
  const plain = typeof user.toObject === 'function' ? user.toObject() : user;
  delete plain.password;
  delete plain.refreshToken;
  return plain;
};

export const registerUser = async (userData: Partial<IUser>) => {
  const { email } = userData;
  const existingEmail = await findUserByEmail(email as string);
  if (existingEmail) {
    throw new AppError(409, 'Email already registered');
  }

  const user = await createUser({ ...userData, role: ROLE.USER });
  return toAuthUser(user);
};

export const registerUserWithRole = async (userData: Partial<IUser>) => {
  const { email } = userData;
  const existingEmail = await findUserByEmail(email as string);
  if (existingEmail) {
    throw new AppError(409, 'Email already registered');
  }

  const user = await createUser(userData);
  return toAuthUser(user);
};

export const refreshAccessToken = async (refreshToken: string, res: any) => {
  try {
    const payload = verifyRefreshToken(refreshToken) as { userId?: string; leadId?: string; role: string };

    // Lead refresh token
    if (payload.leadId && payload.role === 'lead') {
      const lead = await LeadModel.findById(payload.leadId).select('+refreshToken');
      const isValidStoredToken = lead?.refreshToken ? await bcrypt.compare(refreshToken, lead.refreshToken) : false;
      if (!lead || !isValidStoredToken) {
        throw new AppError(401, 'Invalid refresh token');
      }
      const accessToken = createAccessToken({ leadId: lead._id.toString(), role: 'lead' });
      const newRefreshToken = createRefreshToken({ leadId: lead._id.toString(), role: 'lead' });
      await LeadModel.findByIdAndUpdate(lead._id, { refreshToken: await bcrypt.hash(newRefreshToken, 10) });
      setRefreshTokenCookie(res, newRefreshToken);
      return accessToken;
    }

    // User refresh token (admin/superadmin)
    const user = await findUserById(payload.userId!);
    const isValidStoredToken = user?.refreshToken ? await bcrypt.compare(refreshToken, user.refreshToken) : false;
    if (!user || !isValidStoredToken) {
      throw new AppError(401, 'Invalid refresh token');
    }
    const accessToken = createAccessToken({ userId: user.id, role: user.role });
    const newRefreshToken = createRefreshToken({ userId: user.id, role: user.role });
    await updateUserRefreshToken(user.id, await bcrypt.hash(newRefreshToken, 10));
    setRefreshTokenCookie(res, newRefreshToken);
    return accessToken;
  } catch {
    throw new AppError(401, 'Refresh token failed');
  }
};

export const logoutUser = async (refreshToken: string, res: any, allowedRoles?: string[]) => {
  try {
    const payload = verifyRefreshToken(refreshToken) as { userId?: string; leadId?: string; role: string };

    // Lead logout
    if (payload.leadId && payload.role === 'lead') {
      const lead = await LeadModel.findById(payload.leadId).select('+refreshToken');
      if (lead?.refreshToken && await bcrypt.compare(refreshToken, lead.refreshToken)) {
        await LeadModel.findByIdAndUpdate(payload.leadId, { refreshToken: null });
      }
      clearRefreshTokenCookie(res);
      return true;
    }

    // User logout (admin/superadmin)
    if (allowedRoles && !allowedRoles.includes(payload.role) && payload.role !== ROLE.SUPERADMIN) {
      return false;
    }

    const user = await findUserById(payload.userId!);
    if (user?.refreshToken && await bcrypt.compare(refreshToken, user.refreshToken)) {
      await updateUserRefreshToken(user.id, null);
    }
  } catch {
  }
  clearRefreshTokenCookie(res);
  return true;
};
