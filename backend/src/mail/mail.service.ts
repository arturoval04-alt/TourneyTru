import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private transporter: nodemailer.Transporter;

    constructor() {
        const port = Number(process.env.SMTP_PORT) || 465;
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port,
            secure: port === 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    async sendVerificationEmail(email: string, firstName: string, token: string): Promise<void> {
        const frontendUrl = process.env.FRONTEND_URL || 'https://tourneytru.com';
        const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;

        const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Verifica tu correo — TourneyTru</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#1e293b;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a5f,#0f172a);padding:32px 40px;text-align:center;">
              <div style="display:inline-block;background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.3);border-radius:12px;padding:12px 20px;">
                <span style="font-size:22px;font-weight:900;color:#3b82f6;letter-spacing:-0.5px;">TourneyTru</span>
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#f1f5f9;">
                ¡Hola, ${firstName}!
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.6;">
                Gracias por registrarte en <strong style="color:#f1f5f9;">TourneyTru</strong>.
                Para activar tu cuenta y empezar a usar la plataforma, confirma tu correo electrónico.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 32px;">
                    <a href="${verifyUrl}"
                       style="display:inline-block;background-color:#3b82f6;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:0.3px;">
                      Verificar mi correo
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#64748b;line-height:1.6;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:
              </p>
              <p style="margin:0 0 32px;font-size:12px;word-break:break-all;">
                <a href="${verifyUrl}" style="color:#3b82f6;text-decoration:none;">${verifyUrl}</a>
              </p>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:0 0 24px;" />

              <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">
                Este enlace expira en <strong style="color:#94a3b8;">24 horas</strong>.
                Si no creaste esta cuenta, puedes ignorar este correo.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#0f172a;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#334155;">
                © 2026 TourneyTru · tourneytru.com
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

        try {
            await this.transporter.sendMail({
                from: `"TourneyTru" <${process.env.SMTP_USER}>`,
                to: email,
                subject: 'Verifica tu correo — TourneyTru',
                html,
            });
            this.logger.log(`Verification email sent to ${email}`);
        } catch (err) {
            this.logger.error(`Failed to send verification email to ${email}`, err);
            throw err;
        }
    }

    async sendPasswordResetEmail(email: string, firstName: string, token: string): Promise<void> {
        const frontendUrl = process.env.FRONTEND_URL || 'https://tourneytru.com';
        const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

        const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Restablecer contraseña — TourneyTru</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#1e293b;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">

          <tr>
            <td style="background:linear-gradient(135deg,#1e3a5f,#0f172a);padding:32px 40px;text-align:center;">
              <div style="display:inline-block;background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.3);border-radius:12px;padding:12px 20px;">
                <span style="font-size:22px;font-weight:900;color:#3b82f6;letter-spacing:-0.5px;">TourneyTru</span>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#f1f5f9;">
                Restablecer contraseña
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.6;">
                Hola <strong style="color:#f1f5f9;">${firstName}</strong>, recibimos una solicitud para restablecer
                la contraseña de tu cuenta en TourneyTru.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 32px;">
                    <a href="${resetUrl}"
                       style="display:inline-block;background-color:#3b82f6;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:0.3px;">
                      Restablecer contraseña
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#64748b;line-height:1.6;">
                Si el botón no funciona, copia y pega este enlace:
              </p>
              <p style="margin:0 0 32px;font-size:12px;word-break:break-all;">
                <a href="${resetUrl}" style="color:#3b82f6;text-decoration:none;">${resetUrl}</a>
              </p>

              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:0 0 24px;" />

              <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">
                Este enlace expira en <strong style="color:#94a3b8;">1 hora</strong>.
                Si no solicitaste este cambio, ignora este correo — tu contraseña seguirá siendo la misma.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color:#0f172a;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#334155;">
                © 2026 TourneyTru · tourneytru.com
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

        try {
            await this.transporter.sendMail({
                from: `"TourneyTru" <${process.env.SMTP_USER}>`,
                to: email,
                subject: 'Restablecer contraseña — TourneyTru',
                html,
            });
            this.logger.log(`Password reset email sent to ${email}`);
        } catch (err) {
            this.logger.error(`Failed to send password reset email to ${email}`, err);
            throw err;
        }
    }
}
