import { Request, Response } from 'express';
import { AppError } from '../../../utils/app-error';
import { crmAuthService } from './auth.service';

export const crmAuthController = {
  /** POST /crm/auth/login — password + optional TOTP code. */
  async login(req: Request, res: Response) {
    try {
      const { email, password, totpCode } = req.body;
      const result = await crmAuthService.login(email, password, totpCode);

      if (result.requiresTwoFactor) {
        return res.status(200).json({
          ok: true,
          challengeId: result.tempToken,
          tempToken: result.tempToken,
          maskedEmail: 'Authenticator App',
          requiresTwoFactor: true,
        });
      }

      return res.status(200).json({
        ok: true,
        token: result.accessToken,
        user: {
          id: result.admin!.id,
          name: result.admin!.name,
          email: result.admin!.email,
          role: result.admin!.role === 'superadmin' ? 'Super Admin' : 'Admin',
        },
      });
    } catch (err) {
      const appErr = err instanceof AppError ? err : new AppError(500, 'Internal server error');
      return res.status(appErr.statusCode).json({ ok: false, error: appErr.message });
    }
  },

  /** POST /crm/auth/verify-otp & /crm/auth/verify-2fa — verify authenticator TOTP code. */
  async verifyOtp(req: Request, res: Response) {
    try {
      const challengeId = req.body.challengeId || req.body.tempToken;
      const code = req.body.code || req.body.token;

      if (!challengeId || !code) {
        throw new AppError(400, 'Verification session and authenticator code required');
      }

      const result = await crmAuthService.verify2fa(code, challengeId);

      return res.status(200).json({
        ok: true,
        token: result.accessToken,
        user: {
          id: result.admin!.id,
          name: result.admin!.name,
          email: result.admin!.email,
          role: result.admin!.role === 'superadmin' ? 'Super Admin' : 'Admin',
        },
      });
    } catch (err) {
      const appErr = err instanceof AppError ? err : new AppError(500, 'Internal server error');
      return res.status(appErr.statusCode).json({ ok: false, error: appErr.message });
    }
  },

  /** GET /crm/users/:userId — re-hydrate the signed-in user. */
  async getUserById(req: Request, res: Response) {
    try {
      const user = await crmAuthService.getUserById(req.params.userId);
      if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
      return res.status(200).json(user);
    } catch (err) {
      const appErr = err instanceof AppError ? err : new AppError(500, 'Internal server error');
      return res.status(appErr.statusCode).json({ ok: false, error: appErr.message });
    }
  },
};
