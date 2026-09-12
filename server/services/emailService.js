import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root as well as server folder
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

/**
 * Production Resend Email Service Implementation
 */
class ResendEmailService {
  async sendVerificationOtp({ toEmail, name, otpCode, type = 'signup' }) {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const subject = 'Verify your email address';

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b0f19; color: #f8fafc; padding: 32px 24px; border-radius: 12px; max-width: 520px; margin: 0 auto; border: 1px solid #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #6366f1; margin: 0 0 4px 0; font-size: 24px;">TaskMaster Pro</h2>
          <p style="color: #94a3b8; font-size: 13px; margin: 0;">Academic & Team Study Hub</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #334155; margin: 20px 0;" />
        <p style="font-size: 15px; color: #e2e8f0;">Hello <strong>${name || 'User'}</strong>,</p>
        <p style="font-size: 14px; color: #cbd5e1; line-height: 1.5;">
          Your verification code is:
        </p>
        <div style="background: rgba(99, 102, 241, 0.12); border: 1px dashed #6366f1; font-size: 36px; font-weight: 700; letter-spacing: 8px; text-align: center; color: #818cf8; padding: 18px; border-radius: 8px; margin: 24px 0;">
          ${otpCode}
        </div>
        <p style="font-size: 13px; color: #94a3b8; text-align: center; margin-bottom: 20px;">
          ⏳ This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
        </p>
        <hr style="border: 0; border-top: 1px solid #1e293b; margin: 20px 0;" />
        <p style="font-size: 11px; color: #64748b; text-align: center; margin: 0;">
          If you did not request this verification code, please ignore this email.
        </p>
      </div>
    `;

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject,
      html: htmlContent
    });

    if (error) {
      throw new Error(`Resend Delivery Error: ${error.message || JSON.stringify(error)}`);
    }

    console.log(`[ResendEmailService] ✅ Email delivered to ${toEmail} via Resend SDK! (ID: ${data?.id})`);
    return { success: true, provider: 'resend', id: data?.id };
  }
}

/**
 * Console & Nodemailer SMTP Service
 * Sends real email if SMTP/Gmail credentials exist, otherwise logs OTP instantly to console.
 */
class ConsoleEmailService {
  getTransporter() {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASS;
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT || 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (gmailUser && gmailPass) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPass }
      });
    }

    if (smtpHost && smtpUser && smtpPass) {
      return nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort),
        secure: Number(smtpPort) === 465,
        auth: { user: smtpUser, pass: smtpPass }
      });
    }

    return null;
  }

  async sendVerificationOtp({ toEmail, name, otpCode, type = 'signup' }) {
    console.log('\n====================================================');
    console.log(`📩 [DEVELOPMENT MAILER] EMAIL OTP GENERATED`);
    console.log(`👤 RECIPIENT: ${name || 'User'} <${toEmail}>`);
    console.log(`🔑 6-DIGIT OTP CODE: ${otpCode}`);
    console.log(`⏳ EXPIRES IN: 10 minutes`);
    console.log(`📌 PURPOSE: ${type.toUpperCase()}`);
    console.log('====================================================\n');

    const transporter = this.getTransporter();
    if (transporter) {
      try {
        const fromAddr = process.env.GMAIL_USER || process.env.SMTP_USER || '"TaskMaster Pro" <no-reply@taskmasterpro.dev>';
        const info = await transporter.sendMail({
          from: fromAddr,
          to: toEmail,
          subject: 'Verify your email address - TaskMaster Pro',
          text: `Hello ${name || 'User'},\n\nYour 6-digit OTP code is: ${otpCode}\n\nExpires in 10 minutes.\n\nTaskMaster Pro`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 24px; background: #0f172a; color: #fff; border-radius: 8px; max-width: 500px;">
              <h2 style="color: #6366f1;">TaskMaster Pro Verification</h2>
              <p>Hello ${name || 'User'},</p>
              <p>Your 6-digit verification code is:</p>
              <h1 style="color: #818cf8; letter-spacing: 6px; font-size: 36px; margin: 16px 0;">${otpCode}</h1>
              <p style="color: #94a3b8; font-size: 13px;">This code is valid for 10 minutes. Do not share it with anyone.</p>
            </div>
          `
        });
        console.log(`[SMTP Mailer] ✅ Real email sent to ${toEmail}! Message ID: ${info.messageId}`);
        return { success: true, provider: 'smtp', messageId: info.messageId };
      } catch (err) {
        console.error('[SMTP Mailer Error]:', err.message);
      }
    }

    return { success: true, provider: 'console-dev', devOtpCode: otpCode };
  }
}

export class EmailService {
  constructor() {
    this.resendService = new ResendEmailService();
    this.consoleService = new ConsoleEmailService();
  }

  async sendVerificationOtp({ toEmail, name, otpCode, type = 'signup' }) {
    // 1. If Gmail / Custom SMTP is configured, use SMTP (delivers to ANY user email address!)
    const hasSmtp = Boolean((process.env.GMAIL_USER && process.env.GMAIL_APP_PASS) || (process.env.SMTP_HOST && process.env.SMTP_USER));
    if (hasSmtp) {
      const smtpResult = await this.consoleService.sendVerificationOtp({ toEmail, name, otpCode, type });
      if (smtpResult.provider === 'smtp') {
        return smtpResult;
      }
    }

    // 2. Otherwise try Resend SDK
    if (process.env.RESEND_API_KEY) {
      try {
        return await this.resendService.sendVerificationOtp({ toEmail, name, otpCode, type });
      } catch (err) {
        console.error('[EmailService] Resend API error:', err.message);
        throw err;
      }
    }

    return await this.consoleService.sendVerificationOtp({ toEmail, name, otpCode, type });
  }
}

export const emailService = new EmailService();

