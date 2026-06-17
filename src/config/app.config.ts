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

export const config = {
  env: getString('NODE_ENV', 'development'),
  port: Number(getString('PORT', '5000')),
  mongoUri: getFirstString(['MONGO_URI_MAIN', 'MONGO_URI'], 'mongodb://localhost:27017/ensis'),
  jwtAccessSecret: getFirstString(['JWT_SECRET', 'JWT_ACCESS_SECRET'], 'access-secret'),
  jwtRefreshSecret: getFirstString(['JWT_SECRET', 'JWT_REFRESH_SECRET'], 'refresh-secret'),
  accessTokenExpires: getString('ACCESS_TOKEN_EXPIRES', '36500d'),
  refreshTokenExpires: getString('REFRESH_TOKEN_EXPIRES', '36500d'),
  cookieSecure: getBoolean('COOKIE_SECURE', false),
  cookieSameSite: getString('COOKIE_SAME_SITE', 'lax'),
  corsOrigin: getList('CORS_ORIGIN', ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://localhost:5174','https://ensis-admin-omak.vercel.app','https://ensis-frontend-jtom.vercel.app','https://web.ensis.in','https://admin.ensis.in']),
  uploadDir: getString('UPLOAD_DIR', 'src/uploads'),
  uploadMaxFileSizeBytes: getNumber('UPLOAD_MAX_FILE_SIZE_BYTES', 5 * 1024 * 1024),
  uploadMaxFiles: getNumber('UPLOAD_MAX_FILES', 6),
  uploadAllowedMimeTypes: getList('UPLOAD_ALLOWED_MIME_TYPES', ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/gif']),
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
};
