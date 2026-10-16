import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.replace(/\s+/g, '');

    if (!user || !pass) {
      this.logger.warn(
        'SMTP_USER or SMTP_PASS not set in environment. Outbound emails will be logged to console only.',
      );
      this.transporter = null;
      return;
    }

    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT) || 465;
    const secure =
      process.env.SMTP_SECURE !== undefined
        ? process.env.SMTP_SECURE === 'true'
        : port === 465;

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });
      this.logger.log(`SMTP transporter configured successfully with host ${host}:${port} (${user})`);
    } catch (err: any) {
      this.logger.error(`Failed to initialize SMTP transporter: ${err.message}`, err.stack);
      this.transporter = null;
    }
  }

  /**
   * Send Password Reset OTP verification email
   */
  async sendPasswordResetOtp(toEmail: string, code: string): Promise<{ sent: boolean; messageId?: string; error?: string }> {
    const fromAddress = process.env.SMTP_FROM || `"M.SHOP Qatar" <${process.env.SMTP_USER || 'noreply@marjaah.com'}>`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Verification Code</title>
</head>
<body style="margin:0;padding:0;background-color:#0B1120;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F1F5F9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0B1120;padding:40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="540" style="max-width:540px;background-color:#0F172A;border-radius:18px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;background:linear-gradient(135deg, rgba(64,99,178,0.2) 0%, rgba(15,23,42,0.8) 100%);border-bottom:1px solid rgba(255,255,255,0.06);">
              <h1 style="margin:0;font-size:24px;font-weight:900;letter-spacing:1px;color:#FFFFFF;">
                M<span style="color:#4063B2;">.</span>SHOP
              </h1>
              <p style="margin:6px 0 0;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#94A3B8;">
                MARJAAH TRADING W.L.L · QATAR
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px;">
              <h2 style="margin:0 0 12px;font-size:18px;font-weight:700;color:#FFFFFF;text-align:center;">
                Password Reset Verification Code
              </h2>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#94A3B8;text-align:center;">
                We received a request to reset your password for your account associated with <strong style="color:#F1F5F9;">${toEmail}</strong>. Use the 6-digit code below to set a new password:
              </p>

              <!-- OTP Code Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
                <tr>
                  <td align="center">
                    <div style="display:inline-block;padding:16px 36px;background:rgba(64,99,178,0.12);border:2px dashed #4063B2;border-radius:14px;text-align:center;">
                      <span style="font-family:'Courier New',Courier,monospace;font-size:36px;font-weight:900;letter-spacing:10px;color:#60A5FA;">
                        ${code}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin:20px 0 8px;font-size:12px;line-height:1.5;color:#E2E8F0;text-align:center;font-weight:600;">
                ⏱ This verification code is valid for <strong>15 minutes</strong>.
              </p>
              <p style="margin:0 0 24px;font-size:12px;line-height:1.5;color:#64748B;text-align:center;">
                If you did not request a password reset, you can safely ignore this email. Your current password will remain unchanged.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background-color:#090E1A;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0 0 4px;font-size:11px;color:#64748B;">
                © 2026 M.SHOP – Marjaah Trading WLL (CR No. 228717)
              </p>
              <p style="margin:0;font-size:11px;color:#475569;">
                Doha, State of Qatar · Support: info@marjaah.com · +974 7799 1013
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const textContent = `
M.SHOP Qatar - Password Reset Verification Code

We received a request to reset your password for ${toEmail}.
Your 6-digit verification code is: ${code}

This code will expire in 15 minutes.
If you did not request this, you can safely ignore this email.

Marjaah Trading WLL (CR No. 228717), Doha, Qatar
Support: info@marjaah.com | +974 7799 1013
    `.trim();

    if (!this.transporter) {
      // Re-check in case .env was edited while app was running
      this.initTransporter();
    }

    if (!this.transporter) {
      this.logger.warn(`[EMAIL SKIPPED] Transporter not ready. OTP for ${toEmail}: ${code}`);
      return { sent: false, reason: 'SMTP not configured' } as any;
    }

    try {
      const info = await this.transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: `${code} is your M.SHOP password reset code`,
        text: textContent,
        html: htmlContent,
      });

      this.logger.log(`Password reset email successfully sent to ${toEmail} (Message ID: ${info.messageId})`);
      return { sent: true, messageId: info.messageId };
    } catch (err: any) {
      this.logger.error(`Failed to send password reset email to ${toEmail}: ${err.message}`, err.stack);
      return { sent: false, error: err.message };
    }
  }
}
