import { IUser } from '../models/user.model.js';
import { createUser, findUserByEmail, updateUserRefreshToken, findUserById } from '../repositories/user.repository.js';
import { createAccessToken, createRefreshToken, verifyRefreshToken } from '../utils/jwt.utils.js';
import { setRefreshTokenCookie, clearRefreshTokenCookie } from '../helpers/cookie.helper.js';
import bcrypt from 'bcrypt';
import { ROLE } from '../constants/roles.constants.js';

const toAuthUser = (user: any) => {
  const plain = typeof user.toObject === 'function' ? user.toObject() : user;
  delete plain.password;
  delete plain.refreshToken;
  return plain;
};

export const registerUser = async (userData: Partial<IUser>) => {
  const existing = await findUserByEmail(userData.email as string);
  if (existing) {
    const error = new Error('Email already registered');
    (error as any).statusCode = 409;
    throw error;
  }
  const user = await createUser({ ...userData, role: ROLE.USER });
  return toAuthUser(user);
};

export const loginUser = async (email: string, password: string) => {
  const user = await findUserByEmail(email);
  if (!user) {
    const error = new Error('Invalid credentials');
    (error as any).statusCode = 401;
    throw error;
  }
  const isValid = await user.comparePassword(password);
  if (!isValid) {
    const error = new Error('Invalid credentials');
    (error as any).statusCode = 401;
    throw error;
  }
  const accessToken = createAccessToken({ userId: user.id, role: user.role });
  const refreshToken = createRefreshToken({ userId: user.id, role: user.role });
  await updateUserRefreshToken(user.id, await bcrypt.hash(refreshToken, 10));
  return { user: toAuthUser(user), accessToken, refreshToken };
};

export const loginAdmin = async (email: string, password: string) => {
  const result = await loginUser(email, password);
  if (result.user.role !== ROLE.ADMIN) {
    await logoutUser(result.refreshToken, { clearCookie: () => undefined } as any);
    const error = new Error('Admin access required');
    (error as any).statusCode = 403;
    throw error;
  }
  return result;
};

export const refreshAccessToken = async (refreshToken: string, res: any) => {
  try {
    const payload = verifyRefreshToken(refreshToken) as { userId: string };
    const user = await findUserById(payload.userId);
    const isValidStoredToken = user?.refreshToken ? await bcrypt.compare(refreshToken, user.refreshToken) : false;
    if (!user || !isValidStoredToken) {
      const error = new Error('Invalid refresh token');
      (error as any).statusCode = 401;
      throw error;
    }
    const accessToken = createAccessToken({ userId: user.id, role: user.role });
    const newRefreshToken = createRefreshToken({ userId: user.id, role: user.role });
    await updateUserRefreshToken(user.id, await bcrypt.hash(newRefreshToken, 10));
    setRefreshTokenCookie(res, newRefreshToken);
    return accessToken;
  } catch {
    const error = new Error('Refresh token failed');
    (error as any).statusCode = 401;
    throw error;
  }
};

export const logoutUser = async (refreshToken: string, res: any) => {
  try {
    const payload = verifyRefreshToken(refreshToken) as { userId: string };
    const user = await findUserById(payload.userId);
    if (user?.refreshToken && await bcrypt.compare(refreshToken, user.refreshToken)) {
      await updateUserRefreshToken(user.id, null);
    }
  } catch {
    // The cookie is being cleared either way; invalid refresh tokens do not need to fail logout.
  }
  clearRefreshTokenCookie(res);
};


