import net from 'net';
import tls from 'tls';
import { config } from '../config/app.config';

const encodeBase64 = (value: string) => Buffer.from(value).toString('base64');

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

class SmtpClient {
  private socket: net.Socket | tls.TLSSocket | null = null;
  private buffer = '';

  private async connect(): Promise<void> {
    this.socket = config.smtpSecure
      ? tls.connect(config.smtpPort, config.smtpHost)
      : net.connect(config.smtpPort, config.smtpHost);
    await new Promise<void>((resolve, reject) => {
      this.socket!.once('connect', resolve);
      this.socket!.once('error', reject);
    });
    await this.readResponse();
  }

  private async upgradeToTls(): Promise<void> {
    const existing = this.socket;
    if (!existing) throw new Error('SMTP socket is not connected');
    this.socket = tls.connect({ socket: existing, servername: config.smtpHost });
    await new Promise<void>((resolve, reject) => {
      this.socket!.once('secureConnect', resolve);
      this.socket!.once('error', reject);
    });
  }

  private async readResponse(): Promise<string> {
    if (!this.socket) throw new Error('SMTP socket is not connected');
    return new Promise((resolve, reject) => {
      const onData = (chunk: Buffer) => {
        this.buffer += chunk.toString('utf8');
        // Split lines and filter out empty strings caused by trailing newlines
        const lines = this.buffer.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length === 0) return;

        const lastLine = lines[lines.length - 1];
        if (lastLine && /^\d{3} /.test(lastLine)) {
          const response = this.buffer;
          this.buffer = '';
          this.socket!.off('data', onData);
          const code = Number(lastLine.slice(0, 3));
          if (code >= 400) reject(new Error(`SMTP error: ${lastLine}`));
          else resolve(response);
        }
      };
      this.socket!.on('data', onData);
      this.socket!.once('error', reject);
    });
  }

  private async command(command: string): Promise<string> {
    if (!this.socket) throw new Error('SMTP socket is not connected');
    this.socket.write(`${command}\r\n`);
    return this.readResponse();
  }

  async send(to: string, subject: string, text: string, html?: string): Promise<void> {
    await this.connect();
    await this.command(`EHLO ${config.smtpHost || 'localhost'}`);
    if (!config.smtpSecure) {
      await this.command('STARTTLS');
      await this.upgradeToTls();
      await this.command(`EHLO ${config.smtpHost || 'localhost'}`);
    }
    if (config.smtpUser && config.smtpPass) {
      await this.command('AUTH LOGIN');
      await this.command(encodeBase64(config.smtpUser));
      await this.command(encodeBase64(config.smtpPass));
    }
    await this.command(`MAIL FROM:<${config.emailFrom}>`);
    await this.command(`RCPT TO:<${to}>`);
    await this.command('DATA');

    let messageContent: string;
    let contentType: string;

    if (html) {
      contentType = 'Content-Type: text/html; charset=utf-8';
      messageContent = html;
    } else {
      contentType = 'Content-Type: text/plain; charset=utf-8';
      messageContent = text.replace(/^\./gm, '..'); // Escape dots for plain text
    }

    const message = [
      `From: ${formatAddress(config.emailFrom, config.emailFromName)}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      contentType,
      '',
      messageContent,
      '.',
    ].join('\r\n');
    await this.command(message);
    await this.command('QUIT');
  }
}

export const sendEmail = async (to: string, subject: string, text: string, html?: string): Promise<void> => {
  if (config.emailProvider === 'console') {
    console.info(`[Console Email] To: ${to} | Subject: ${subject}`);
    console.info(`Content (Text): ${text}`);
    if (html) console.info(`Content (HTML): ${html}`);
    return;
  }
  await new SmtpClient().send(to, subject, text, html);
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
  await new SmtpClient().send(email, 'Your verification code', message); // OTP emails are typically plain text
};
