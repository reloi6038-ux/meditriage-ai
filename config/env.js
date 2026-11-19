const required = ['MONGODB_URI'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) throw new Error(`Missing env: ${missing.join(', ')}`);

module.exports = {
  PORT: process.env.PORT || 3000,
  MONGODB_URI: process.env.MONGODB_URI,
  NODE_ENV: process.env.NODE_ENV || 'development',
  RATE_MAX: Number(process.env.RATE_MAX || 120),

  // Auth
  JWT_SECRET: process.env.JWT_SECRET || 'dev-only-secret-CHANGE-IN-PRODUCTION',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || '',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',

  // Email / SMTP
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'MediTriage AI <no-reply@meditriage.local>',
  APP_BASE_URL: process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
};