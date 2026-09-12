import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

dotenv.config();

/**
 * Production Resend Email Service Implementation
 * Uses official Resend SDK. Reads process.env.RESEND_API_KEY & process.env.RESEND_FROM_EMAIL.
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
      console.error('[Resend SDK Error]:', error);
      throw new Error(`Resend Delivery Error: ${error.message}`);
    }

    console.log(`[ResendEmailService] ✅ Email delivered to ${toEmail} via Resend SDK! (ID: ${data?.id})`);
    return { success: true, provider: 'resend', id: data?.id };
  }
}

/**
 * Console / Development Fallback Email Service
 * Logs formatted OTP verification codes to the server terminal console.
 */
class ConsoleEmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  async initTransporter() {
    const user = process.env.GMAIL_USER || process.env.SMTP_USER;
    const pass = process.env.GMAIL_APP_PASS || process.env.SMTP_PASS;

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
      });
    } else {
      try {
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: { user: testAccount.user, pass: testAccount.pass }
        });
      } catch (err) {
        // Fallback silently if offline
      }
    }
  }

  async sendVerificationOtp({ toEmail, name, otpCode, type = 'signup' }) {
    console.log('\n====================================================');
    console.log(`📩 [DEVELOPMENT MAILER] EMAIL OTP GENERATED`);
    console.log(`👤 RECIPIENT: ${name || 'User'} <${toEmail}>`);
    console.log(`🔑 6-DIGIT OTP CODE: ${otpCode}`);
    console.log(`⏳ EXPIRES IN: 10 minutes`);
    console.log(`📌 PURPOSE: ${type.toUpperCase()}`);
    console.log('====================================================\n');

    if (this.transporter) {
      try {
        const subject = 'Verify your email address';
        const info = await this.transporter.sendMail({
          from: '"TaskMaster Pro" <no-reply@taskmasterpro.dev>',
          to: toEmail,
          subject,
          text: `Hello ${name || 'User'},\n\nYour 6-digit OTP code is: ${otpCode}\n\nExpires in 10 minutes.\n\nTaskMaster Pro`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; background: #0f172a; color: #fff; border-radius: 8px;">
              <h2>TaskMaster Pro Verification</h2>
              <p>Your 6-digit verification code is:</p>
              <h1 style="color: #818cf8; letter-spacing: 4px;">${otpCode}</h1>
              <p>Valid for 10 minutes.</p>
            </div>
          `
        });

        if (nodemailer.getTestMessageUrl(info)) {
          console.log(`[ConsoleEmailService] 🔗 Preview Email URL: ${nodemailer.getTestMessageUrl(info)}`);
        }
      } catch (err) {
        // Console output above is sufficient for local development
      }
    }

    return { success: true, provider: 'console-dev' };
  }
}

// Mailer Factory: Selects Resend if RESEND_API_KEY is configured, otherwise fallback to Console/Dev mailer
export class EmailService {
  constructor() {
    this.resendService = new ResendEmailService();
    this.consoleService = new ConsoleEmailService();
  }

  async sendVerificationOtp({ toEmail, name, otpCode, type = 'signup' }) {
    if (process.env.RESEND_API_KEY) {
      try {
        return await this.resendService.sendVerificationOtp({ toEmail, name, otpCode, type });
      } catch (err) {
        console.error('[EmailService] Resend API error, falling back to Development Mailer:', err.message);
        return await this.consoleService.sendVerificationOtp({ toEmail, name, otpCode, type });
      }
    }

    // Default to Console/Development Service
    return await this.consoleService.sendVerificationOtp({ toEmail, name, otpCode, type });
  }
}

export const emailService = new EmailService();
