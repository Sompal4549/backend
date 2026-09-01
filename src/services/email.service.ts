import nodemailer from 'nodemailer';
import { config } from '../config/app.config';

const formatAddress = (email: string, name?: string) => {
  if (!name) return email;
  return `"${name.replace(/"/g, '\\"')}" <${email}>`;
};

const buildOtpMessage = (otp: string, customMessage?: string) => {
  const defaultMessage = `
Hello,

Thank you for choosing Ensis.

Your One-Time Password (OTP) for account verification is:

${otp}

This OTP is valid for ${config.otpExpiresMinutes} minutes and can only be used once.

For your security, please do not share this code with anyone. If you did not request this verification, you may safely ignore this email.

Regards,
The Ensis Team
`.trim();

  if (!customMessage) return defaultMessage;

  return customMessage.includes('{{code}}')
    ? customMessage.split('{{code}}').join(otp)
    : `${customMessage}\n\nVerification Code: ${otp}`;
};

const createTransporter = () => {
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });
};

export const sendEmail = async (to: string, subject: string, text: string, html?: string): Promise<void> => {
  if (config.emailProvider === 'console') {
    console.info(`[Console Email] To: ${to} | Subject: ${subject}`);
    console.info(`Content (Text): ${text}`);
    if (html) console.info(`Content (HTML): ${html}`);
    return;
  }
  const transporter = createTransporter();
  await transporter.sendMail({
    from: formatAddress(config.emailFrom, config.emailFromName),
    to,
    subject,
    text,
    html: html || undefined,
  });
};

export const sendEmailOtp = async (email: string, otp: string, customMessage?: string): Promise<void> => {
  const message = buildOtpMessage(otp, customMessage);
  if (config.emailProvider === 'console') {
    console.info(`Email OTP for ${email}: ${otp}`);
    if (customMessage) console.info(`Custom message: ${message}`);
    return;
  }
  if (config.emailProvider !== 'smtp') {
    throw new Error('Unsupported email provider');
  }
  if (!config.smtpHost || !config.emailFrom || !config.smtpUser || !config.smtpPass) {
    throw new Error('SMTP email configuration is incomplete');
  }
  const transporter = createTransporter();
  await transporter.sendMail({
    from: formatAddress(config.emailFrom, config.emailFromName),
    to: email,
    subject: 'Your verification code',
    text: message,
  });
};
