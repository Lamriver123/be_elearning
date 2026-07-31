import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('MAIL_PORT', 587),
      secure: false,
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
    });
  }

  async sendOtpEmail(to: string, otp: string, userName: string): Promise<void> {
    const from = this.configService.get<string>('MAIL_FROM', 'E-Learning <noreply@elearning.com>');

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; background-color:#f4f7fa; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fa; padding:40px 0;">
        <tr>
          <td align="center">
            <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:16px; box-shadow:0 4px 24px rgba(0,0,0,0.08); overflow:hidden;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #0D8ABC 0%, #06B6D4 100%); padding:32px 40px; text-align:center;">
                  <h1 style="color:#ffffff; margin:0; font-size:24px; font-weight:700; letter-spacing:0.5px;">
                    📚 E-Learning Platform
                  </h1>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:40px;">
                  <p style="color:#1e293b; font-size:16px; margin:0 0 8px;">
                    Xin chào <strong>${userName}</strong>,
                  </p>
                  <p style="color:#64748b; font-size:14px; line-height:1.6; margin:0 0 32px;">
                    Đây là mã xác thực OTP của bạn. Vui lòng nhập mã bên dưới để hoàn tất xác thực.
                  </p>

                  <!-- OTP Code -->
                  <div style="text-align:center; margin:0 0 32px;">
                    <div style="display:inline-block; background:linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border:2px dashed #0D8ABC; border-radius:12px; padding:20px 40px;">
                      <span style="font-size:36px; font-weight:800; letter-spacing:12px; color:#0D8ABC; font-family:'Courier New',monospace;">
                        ${otp}
                      </span>
                    </div>
                  </div>

                  <!-- Warning -->
                  <div style="background-color:#fef3c7; border-left:4px solid #f59e0b; border-radius:0 8px 8px 0; padding:16px; margin:0 0 32px;">
                    <p style="color:#92400e; font-size:13px; margin:0; line-height:1.5;">
                      ⏱️ Mã OTP sẽ hết hạn sau <strong>1 phút</strong>.<br/>
                      🔒 Không chia sẻ mã này với bất kỳ ai.
                    </p>
                  </div>

                  <p style="color:#94a3b8; font-size:13px; line-height:1.5; margin:0;">
                    Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background-color:#f8fafc; padding:24px 40px; text-align:center; border-top:1px solid #e2e8f0;">
                  <p style="color:#94a3b8; font-size:12px; margin:0;">
                    © ${new Date().getFullYear()} E-Learning Platform. All rights reserved.
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

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: `[E-Learning] Mã xác thực OTP: ${otp}`,
        html: htmlContent,
      });
      this.logger.log(`OTP email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${to}`, error);
      throw error;
    }
  }
}
