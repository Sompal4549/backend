import { Response } from 'express';
import { config } from '../config/app.config';

export const setRefreshTokenCookie = (res: Response, token: string) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite as 'lax' | 'strict' | 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const clearRefreshTokenCookie = (res: Response) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite as 'lax' | 'strict' | 'none',
  });
};
