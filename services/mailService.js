const nodemailer = require('nodemailer');
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, NODE_ENV } = require('../config/env');

let transporter = null;
let lastError = null;

function smtpConfigured() {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

function getTransporter() {
  if (transporter) return transporter;
  if (!smtpConfigured()) {
    lastError = 'SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing)';
    return null;
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // 465 = implicit TLS, 587 = STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    // Give it a bit of time on cold starts
    connectionTimeout: 10000,
    greetingTimeout: 8000,
    socketTimeout: 15000,
  });
  return transporter;
}

// Try to send. Returns { ok, error?, previewUrl? }.
async function sendMail({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) {
    // Not configured — log to console for local dev, but don't crash
    // eslint-disable-next-line no-console
    console.warn('[mail] SMTP not configured. Would have sent:');
    console.warn('       To:', to);
    console.warn('       Subject:', subject);
    console.warn('       Text:', String(text || '').slice(0, 400));
    return { ok: false, error: lastError || 'SMTP not configured' };
  }
  try {
    const info = await t.sendMail({ from: SMTP_FROM, to, subject, text, html });
    // If the provider is Ethereal, info has a preview URL
    let previewUrl = null;
    try {
      const nodemailerUrl = require('nodemailer').getTestMessageUrl(info);
      if (nodemailerUrl) previewUrl = nodemailerUrl;
    } catch (_) {}
    if (NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('[mail] sent', info.messageId, previewUrl ? '| preview: ' + previewUrl : '');
    }
    return { ok: true, messageId: info.messageId, previewUrl };
  } catch (err) {
    lastError = err.message;
    // eslint-disable-next-line no-console
    console.error('[mail] send failed:', err.message);
    return { ok: false, error: err.message };
  }
}

async function verifyTransport() {
  const t = getTransporter();
  if (!t) return { ok: false, error: lastError || 'SMTP not configured' };
  try {
    await t.verify();
    return { ok: true };
  } catch (err) {
    lastError = err.message;
    return { ok: false, error: err.message };
  }
}

module.exports = { sendMail, verifyTransport, smtpConfigured };