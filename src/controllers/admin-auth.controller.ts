import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/user.model';
import { ROLE } from '../constants/roles.constants';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { config } from '../config/app.config';
import { setRefreshTokenCookie } from '../helpers/cookie.helper';
import {
  loginAdminService,
  verify2FAService,
  setup2FAService,
  confirm2FAService,
} from '../services/admin-auth.service';

export const handleUnifiedLogin = (req: Request, res: Response, next: NextFunction) => {
  const { email, identifier, password, totpCode } = req.body;

  // If password-based login (Admin/Staff)
  if (password || email || identifier) {
    loginAdminService({ email, identifier, password, totpCode })
      .then((result) => {
        if (result.requiresTwoFactor) {
          return res.status(200).json({
            success: true,
            message: '2FA required',
            data: result,
            ...result,
          });
        }

        if (result.refreshToken) {
          setRefreshTokenCookie(res, result.refreshToken);
        }

        return res.status(200).json({
          success: true,
          message: 'Login successful',
          data: result,
          ...result,
        });
      })
      .catch(next);
    return;
  }

  // Otherwise, fall through to customer/lead OTP login
  return next();
};

const extractAdminUserId = (req: Request): string | null => {
  let userId = (req as any).user?.id || (req as any).user?.userId;
  if (userId) return userId;

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : (req.cookies?.ms_admin_token || req.cookies?.accessToken);

  if (token) {
    try {
      const decoded: any = jwt.verify(token, config.jwtAccessSecret);
      return decoded.id || decoded.userId || null;
    } catch {}
  }
  return null;
};

export const handleVerify2FA = asyncHandler(async (req: Request, res: Response) => {
  const { token, tempToken } = req.body;

  if (tempToken) {
    const result = await verify2FAService(token, tempToken);
    if (result.refreshToken) {
      setRefreshTokenCookie(res, result.refreshToken);
    }
    return res.status(200).json({
      success: true,
      data: result,
      ...result,
      message: '2FA verified — login successful',
    });
  }

  // If called by an authenticated admin to confirm setup
  const userId = extractAdminUserId(req);

  if (userId) {
    const result = await confirm2FAService(userId, token);
    return res.status(200).json({
      success: true,
      data: result,
      ...result,
      message: '2FA setup confirmed successfully',
    });
  }

  // 401 so the admin client refreshes an expired access token and retries
  throw new AppError(401, 'Missing tempToken or authorization token');
});

export const handleSetup2FA = asyncHandler(async (req: Request, res: Response) => {
  const userId = extractAdminUserId(req);

  if (!userId) {
    throw new AppError(401, 'Unauthorized');
  }

  const result = await setup2FAService(userId);
  return res.status(200).json({
    success: true,
    data: result,
    ...result,
  });
});

export const handleConfirm2FA = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;
  const userId = extractAdminUserId(req);

  if (!userId) {
    throw new AppError(401, 'Unauthorized');
  }

  const result = await confirm2FAService(userId, token);
  return res.status(200).json({
    success: true,
    data: result,
    ...result,
  });
});

export const handleGetMe = asyncHandler(async (req: Request, res: Response) => {
  const userId = extractAdminUserId(req);

  if (!userId) {
    throw new AppError(401, 'Unauthorized');
  }

  const user = await UserModel.findById(userId);
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const admin = {
    id: user._id.toString(),
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    roleSlug: user.role === ROLE.SUPERADMIN ? 'SUPER_ADMIN' : 'ADMIN',
    isTwoFactorEnabled: !!user.isTwoFactorEnabled,
  };

  // The admin panel reads `user` (organic_admin contract); without it the login page
  // treats the session as invalid and logs out mid 2FA setup.
  return res.status(200).json({
    success: true,
    data: { user: admin, admin },
    user: admin,
    admin,
  });
});
