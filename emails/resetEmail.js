const { APP_BASE_URL } = require('../config/env');

function buildResetEmail({ email, token, expiresInMinutes }) {
  const link = `${APP_BASE_URL}/reset.html?token=${encodeURIComponent(token)}`;
  const subject = 'Reset your MediTriage AI password';

  const text = [
    'Hi,',
    '',
    'You requested a password reset for your MediTriage AI account.',
    '',
    `Reset link (valid for ${expiresInMinutes} minutes):`,
    link,
    '',
    'Or paste this code into the reset page:',
    token,
    '',
    "If you didn't request this, you can safely ignore this email. Your password won't change.",
    '',
    '— MediTriage AI',
    'This is a decision-support tool, not a medical device.',
  ].join('\n');

  const html = `
<!doctype html>
<html><body style="margin:0;padding:0;background:#f0fdfa;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f0fdfa;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:14px;box-shadow:0 6px 24px rgba(15,23,42,.08);overflow:hidden;">
          <tr>
            <td style="padding:24px 28px;background:linear-gradient(135deg,#0891b2,#0e7490);color:#ffffff;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="vertical-align:middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:middle;">
                          <div style="width:34px;height:34px;border-radius:9px;background:rgba(255,255,255,.15);text-align:center;line-height:34px;font-size:20px;font-weight:900;">+</div>
                        </td>
                        <td style="vertical-align:middle;padding-left:10px;">
                          <div style="font-size:16px;font-weight:800;letter-spacing:-.01em;">MediTriage AI</div>
                          <div style="font-size:11px;opacity:.8;text-transform:uppercase;letter-spacing:.06em;font-weight:600;">Password reset</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 14px;font-size:15px;color:#0f172a;line-height:1.6;">
                Someone requested a password reset for <strong>${email}</strong>.
                If that was you, click the button below to set a new password.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0;">
                <tr>
                  <td align="center">
                    <a href="${link}" style="display:inline-block;background:#0891b2;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:700;font-size:15px;">
                      Set a new password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px;font-size:12px;color:#64748b;line-height:1.5;">
                Or paste this code into the reset page:
              </p>
              <p style="margin:0 0 20px;padding:12px 14px;background:#f0fdfa;border:1px solid #a5f3fc;border-radius:8px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;color:#0e7490;word-break:break-all;">
                ${token}
              </p>

              <p style="margin:0;font-size:12px;color:#64748b;line-height:1.55;">
                This link is valid for <strong>${expiresInMinutes} minutes</strong>. If you didn't request this, you can safely ignore this email — your password won't change.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;line-height:1.55;">
              <strong style="color:#64748b;">Medical disclaimer:</strong> MediTriage AI is a decision-support and educational tool, not a medical device. It does not diagnose disease and is not a substitute for professional medical advice. In an emergency, call your local emergency number.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body></html>`;

  return { subject, text, html };
}

module.exports = { buildResetEmail };