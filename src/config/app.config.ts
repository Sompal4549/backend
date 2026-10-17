import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const getString = (key: string, defaultValue = ''): string => (process.env[key] || defaultValue).trim();
const getFirstString = (keys: string[], defaultValue = ''): string => {
  for (const key of keys) {
    if (process.env[key]) return (process.env[key] as string).trim();
  }
  return defaultValue;
};
const getNumber = (key: string, defaultValue: number): number => {
  const value = Number(process.env[key]);
  return Number.isFinite(value) ? value : defaultValue;
};
const getBoolean = (key: string, defaultValue = false): boolean => {
  const value = process.env[key];
  return value ? value.toLowerCase() === 'true' : defaultValue;
};
const getList = (key: string, defaultValue: string[]): string[] => {
  const value = process.env[key];
  return value ? value.split(',').map((item) => item.trim()).filter(Boolean) : defaultValue;
};

const isProduction = getString('NODE_ENV', 'development') === 'production';
const DEFAULT_ACCESS_SECRET = 'access-secret-change-me';
const DEFAULT_REFRESH_SECRET = 'refresh-secret-change-me';
const accessSecret = getFirstString(['JWT_ACCESS_SECRET', 'JWT_SECRET'], DEFAULT_ACCESS_SECRET);

// Domains the website and admin are served from; CORS_ORIGIN adds to these instead of replacing them
const DEFAULT_CORS_ORIGINS = [
  'http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://localhost:5174',
  'https://ensis-admin-omak.vercel.app', 'https://ensis-frontend-jtom.vercel.app',
  'https://web.ensis.in', 'https://admin.ensis.in', 'https://ensis.in', 'https://www.ensis.in',
];

export const config = {
  env: getString('NODE_ENV', 'development'),
  isProduction,
  port: Number(getString('PORT', '5000')),
  mongoUri: getFirstString(['MONGO_URI_MAIN'], 'mongodb://localhost:27017/ensis'),
  jwtAccessSecret: accessSecret,
  // Never fall back to the public default when an access secret exists: derive the refresh secret from it
  jwtRefreshSecret: getFirstString(
    ['JWT_REFRESH_SECRET'],
    accessSecret === DEFAULT_ACCESS_SECRET ? DEFAULT_REFRESH_SECRET : `${accessSecret}:refresh`
  ),
  usesDefaultJwtSecret: accessSecret === DEFAULT_ACCESS_SECRET,
  accessTokenExpires: getString('ACCESS_TOKEN_EXPIRES', '15m'),
  refreshTokenExpires: getString('REFRESH_TOKEN_EXPIRES', '7d'),
  // HTTPS-only cookies in production unless explicitly switched off
  cookieSecure: getBoolean('COOKIE_SECURE', isProduction),
  cookieSameSite: getString('COOKIE_SAME_SITE', 'lax'),
  corsOrigin: Array.from(new Set([...DEFAULT_CORS_ORIGINS, ...getList('CORS_ORIGIN', [])].map((o) => o.replace(/\/$/, '')))),
  uploadDir: getString('UPLOAD_DIR', 'src/uploads'),
  uploadMaxFileSizeBytes: getNumber('UPLOAD_MAX_FILE_SIZE_BYTES', 100 * 1024 * 1024),
  uploadMaxFiles: getNumber('UPLOAD_MAX_FILES', 6),
  uploadAllowedMimeTypes: getList('UPLOAD_ALLOWED_MIME_TYPES', [
    'image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/gif', 'image/avif',
    'application/pdf',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/ogg', 'video/x-matroska',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/webm', 'audio/mp4', 'audio/x-m4a',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv'
  ]),
  otpLength: getNumber('OTP_LENGTH', 6),
  otpExpiresMinutes: getNumber('OTP_EXPIRES_MINUTES', 10),
  otpMaxVerifyAttempts: getNumber('OTP_MAX_VERIFY_ATTEMPTS', 10),
  otpResendLimit: getNumber('OTP_RESEND_LIMIT', 5),
  otpResendWindowMinutes: getNumber('OTP_RESEND_WINDOW_MINUTES', 30),
  emailProvider: getString('EMAIL_PROVIDER', process.env.SMTP_HOST ? 'smtp' : 'console'),
  smtpHost: getString('SMTP_HOST'),
  smtpPort: getNumber('SMTP_PORT', 587),
  smtpSecure: getBoolean('SMTP_SECURE', false),
  smtpUser: getString('SMTP_USER'),
  smtpPass: getString('SMTP_PASS'),
  emailFrom: getFirstString(['FROM_EMAIL', 'EMAIL_FROM'], getString('SMTP_USER')),
  emailFromName: getFirstString(['FROM_NAME', 'EMAIL_FROM_NAME'], 'Ecommerce'),
  whatsappProvider: getString('WHATSAPP_PROVIDER', process.env.OPUS_API_KEY ? 'opus' : 'console'),
  whatsappApiKey: getString('OPUS_API_KEY'),
  whatsappSender: getString('ADMIN_WHATSAPP_NUMBER'),
  razorpayKeyId: getFirstString(['RAZORPAY_API_KEY', 'RAZORPAY_KEY_ID', 'RAJORPAY_API_KEY']),
  razorpayKeySecret: getFirstString(['RAZORPAY_TEST_SECRET', 'RAZORPAY_KEY_SECRET', 'RAJORPAY_TEST_SECRET']),
  razorpayWebhookSecret: getFirstString(['RAZORPAY_WEBHOOK_SECRET', 'RAJORPAY_WEBHOOK_SECRET']),
  cloudinaryCloudName: getString('CLOUDINARY_CLOUD_NAME'),
  cloudinaryApiKey: getString('CLOUDINARY_API_KEY'),
  cloudinaryApiSecret: getString('CLOUDINARY_API_SECRET'),
  // The fixed test OTP for OTP_BYPASS_NUMBERS works only outside production unless this is "true"
  otpBypassInProduction: getBoolean('OTP_BYPASS_IN_PRODUCTION', false),
};

/**
 * Startup check. Problems that would make production insecure stop the server;
 * missing optional services only log a warning.
 */
export const checkEnvironment = (): void => {
  const fatal: string[] = [];
  const warnings: string[] = [];

  if (config.isProduction) {
    if (config.usesDefaultJwtSecret) fatal.push('JWT_ACCESS_SECRET (or JWT_SECRET) is not set — tokens would be signed with a public default secret.');
    if (!process.env.MONGO_URI_MAIN) fatal.push('MONGO_URI_MAIN is not set.');
    if (!process.env.JWT_REFRESH_SECRET) warnings.push('JWT_REFRESH_SECRET is not set — a secret derived from JWT_ACCESS_SECRET is used.');
    if (!config.cookieSecure) warnings.push('COOKIE_SECURE=false in production — login cookies are sent without the Secure flag.');
    if (process.env.OTP_BYPASS_NUMBERS && config.otpBypassInProduction) warnings.push('OTP_BYPASS_IN_PRODUCTION=true — the listed test numbers can log in with a fixed OTP.');
  }
  if (!config.razorpayKeyId || !config.razorpayKeySecret) warnings.push('Razorpay keys missing — online payments are disabled.');
  if (!config.razorpayWebhookSecret) warnings.push('RAZORPAY_WEBHOOK_SECRET missing — Razorpay webhooks will be rejected (orders paid but closed tab stay pending).');
  if (!config.cloudinaryCloudName || !config.cloudinaryApiKey || !config.cloudinaryApiSecret) warnings.push('Cloudinary keys missing — image uploads will fail.');
  if (!config.smtpHost) warnings.push('SMTP_HOST missing — emails are only printed to the console.');
  if (!config.whatsappApiKey) warnings.push('OPUS_API_KEY missing — WhatsApp messages are only printed to the console.');

  warnings.forEach((w) => console.warn(`[env] ${w}`));
  if (fatal.length) {
    fatal.forEach((f) => console.error(`[env] ${f}`));
    throw new Error('Unsafe production configuration — fix the [env] errors above.');
  }
};
