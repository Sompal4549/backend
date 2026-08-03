import { IUser } from '../models/user.model';
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
    const payload = verifyRefreshToken(refreshToken) as { userId: string };
    const user = await findUserById(payload.userId);
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
    const payload = verifyRefreshToken(refreshToken) as { userId: string; role: string };

    // If role checking is required, ensure the token's role matches the intended context
    if (allowedRoles && !allowedRoles.includes(payload.role) && payload.role !== ROLE.SUPERADMIN) {
      return false;
    }

    const user = await findUserById(payload.userId);
    if (user?.refreshToken && await bcrypt.compare(refreshToken, user.refreshToken)) {
      await updateUserRefreshToken(user.id, null);
    }
  } catch {
  }
  clearRefreshTokenCookie(res);
  return true;
};
