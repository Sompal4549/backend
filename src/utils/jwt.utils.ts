import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/app.config.ts';

export const createAccessToken = (payload: object): string => {
  const options: SignOptions = { expiresIn: config.accessTokenExpires as SignOptions['expiresIn'] };
  return jwt.sign(payload, config.jwtAccessSecret, options);
};

export const createRefreshToken = (payload: object): string => {
  const options: SignOptions = { expiresIn: config.refreshTokenExpires as SignOptions['expiresIn'] };
  return jwt.sign(payload, config.jwtRefreshSecret, options);
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, config.jwtRefreshSecret);
};
