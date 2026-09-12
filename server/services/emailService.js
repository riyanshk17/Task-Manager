import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root as well as server folder
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

/**
 * Gmail SMTP Email Service using Nodemailer
 */
export class EmailService {
  getTransporter() {
    const user = process.env.EMAIL_USER || process.env.GMAIL_USER;
    const pass = process.env.EMAIL_APP_PASSWORD || process.env.GMAIL_APP_PASS;

    if (user && pass) {
      return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // SSL
        auth: { user, pass }
      });
    }

    return null;
  }

  async sendVerificationOtp({ toEmail, name, otpCode, type = 'signup' }) {
    const cleanRecipient = (toEmail || '').trim().toLowerCase();
    if (!cleanRecipient) {
      throw new Error('Recipient email address is required.');
    }

    const user = process.env.EMAIL_USER || process.env.GMAIL_USER;
    const transporter = this.getTransporter();

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b0f19; color: #f8fafc; padding: 32px 24px; border-radius: 12px; max-width: 520px; margin: 0 auto; border: 1px solid #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #6366f1; margin: 0 0 4px 0; font-size: 24px;">TaskMaster Pro</h2>
          <p style="color: #94a3b8; font-size: 13px; margin: 0;">Academic & Team Study Hub</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #334155; margin: 20px 0;" />
        <p style="font-size: 15px; color: #e2e8f0;">Hello <strong>${name || 'User'}</strong>,</p>
        <p style="font-size: 14px; color: #cbd5e1; line-height: 1.5;">
          Your single-use security verification code is:
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

    if (transporter) {
      try {
        const fromHeader = `"Task Manager" <${user}>`;
        const info = await transporter.sendMail({
          from: fromHeader,
          to: cleanRecipient,
          subject: 'Verify your email address - TaskMaster Pro',
          text: `Hello ${name || 'User'},\n\nYour 6-digit verification code is: ${otpCode}\n\nThis code expires in 10 minutes.\n\nTaskMaster Pro`,
          html: htmlContent
        });

        console.log(`[Gmail SMTP Mailer] ✅ Verification email sent to ${cleanRecipient}. Message ID: ${info.messageId}`);
        return { success: true, provider: 'gmail-smtp', messageId: info.messageId };
      } catch (err) {
        console.error(`[Gmail SMTP Delivery Error] Failed sending to ${cleanRecipient}:`, err.message);
        throw new Error("We couldn't send the verification code. Please try again later.");
      }
    }

    // Development Console fallback if EMAIL_USER/EMAIL_APP_PASSWORD are not set in local environment yet
    console.log('\n====================================================');
    console.log(`📩 [DEV FALLBACK MAILER] EMAIL OTP GENERATED`);
    console.log(`👤 RECIPIENT: ${name || 'User'} <${cleanRecipient}>`);
    console.log(`🔑 6-DIGIT OTP CODE: ${otpCode}`);
    console.log(`⏳ EXPIRES IN: 10 minutes`);
    console.log(`📌 PURPOSE: ${type.toUpperCase()}`);
    console.log('⚠️ Set EMAIL_USER and EMAIL_APP_PASSWORD in .env for real Gmail delivery.');
    console.log('====================================================\n');

    return { success: true, provider: 'console-dev' };
  }
}

export const emailService = new EmailService();


