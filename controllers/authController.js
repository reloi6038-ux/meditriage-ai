const crypto = require('crypto');
const Joi = require('joi');
const User = require('../models/User');
const { signUser } = require('../utils/tokens');
const asyncHandler = require('../utils/asyncHandler');
const audit = require('../services/auditService');
const mail = require('../services/mailService');
const { buildResetEmail } = require('../emails/resetEmail');
const { NODE_ENV } = require('../config/env');

const RESET_TTL_MIN = 60;

const registerSchema = Joi.object({
  email: Joi.string().email().max(120).required(),
  password: Joi.string().min(8).max(120).required(),
  displayName: Joi.string().max(60).allow('').optional(),
});
const loginSchema = Joi.object({
  email: Joi.string().email().max(120).required(),
  password: Joi.string().required(),
});
exports.schemas = { registerSchema, loginSchema };

exports.register = asyncHandler(async (req, res) => {
  const { email, password, displayName } = req.body;
  const existing = await User.findOne({ email });
  if (existing) { const e = new Error('Email already registered'); e.status = 409; throw e; }
  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ email, passwordHash, displayName: displayName || '' });
  audit.log('user.register', { email, actor: user._id });
  res.status(201).json({ success: true, data: { user: user.toJSON(), token: signUser(user) } });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) { const e = new Error('Invalid credentials'); e.status = 401; throw e; }
  const ok = await user.verifyPassword(password);
  if (!ok) { const e = new Error('Invalid credentials'); e.status = 401; throw e; }
  user.lastLoginAt = new Date();
  await user.save();
  audit.log('user.login', { email, actor: user._id });
  res.json({ success: true, data: { user: user.toJSON(), token: signUser(user) } });
});

exports.logout = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { ok: true } });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

// ---- Password reset: request ----
// Response NEVER reveals whether the email exists.
// In non-production we still return the token when SMTP is not configured,
// so local testing works without an email provider.
exports.requestReset = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const genericResponse = {
    success: true,
    data: { message: 'If an account exists for that email, a reset link has been sent.' },
  };

  const user = await User.findOne({ email });
  if (!user) {
    // Same shape, same latency ballpark — do NOT reveal existence
    return res.json(genericResponse);
  }

  const raw = crypto.randomBytes(24).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(raw).digest('hex');
  user.passwordResetExpires = new Date(Date.now() + RESET_TTL_MIN * 60 * 1000);
  await user.save();

  audit.log('user.reset.request', { email });

  // Try to send email
  const tpl = buildResetEmail({ email, token: raw, expiresInMinutes: RESET_TTL_MIN });
  const mailResult = await mail.sendMail({
    to: email,
    subject: tpl.subject,
    text: tpl.text,
    html: tpl.html,
  });

  // Dev convenience: if SMTP is not configured, surface the token so local
  // testing works. In production this branch never runs because SMTP is set.
  if (NODE_ENV !== 'production' && (!mailResult.ok)) {
    return res.json({
      success: true,
      data: {
        message: 'Reset token generated (SMTP not configured — dev mode).',
        token: raw,
        emailDelivery: 'console',
        note: 'Add SMTP_HOST / SMTP_USER / SMTP_PASS to .env to send real email.',
      },
    });
  }

  // If the email send failed in production, log it but still return generic
  if (!mailResult.ok && NODE_ENV === 'production') {
    // eslint-disable-next-line no-console
    console.error('[reset] email delivery failed for', email, ':', mailResult.error);
  }

  return res.json(genericResponse);
});

// ---- Password reset: confirm ----
exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const hashed = crypto.createHash('sha256').update(token || '').digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpires: { $gt: new Date() },
  });
  if (!user) { const e = new Error('Invalid or expired reset token'); e.status = 400; throw e; }
  user.passwordHash = await User.hashPassword(password);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  audit.log('user.reset.complete', { email: user.email });
  res.json({ success: true, data: { ok: true } });
});

exports.deleteAccount = asyncHandler(async (req, res) => {
  if (!req.user) { const e = new Error('Auth required'); e.status = 401; throw e; }
  const Assessment = require('../models/Assessment');
  await Assessment.deleteMany({ userId: req.user._id });
  await User.deleteOne({ _id: req.user._id });
  audit.log('user.delete', { actor: req.user._id });
  res.json({ success: true, data: { ok: true } });
});