const r = require('express').Router();
const c = require('../controllers/authController');
const validate = require('../middleware/validate');
const authLimiter = require('../middleware/authRateLimiter');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth');

// Extra-strict limiter for password reset requests — 5 per hour per IP
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many reset requests. Try again in an hour.' },
});

r.post('/register', authLimiter, validate(c.schemas.registerSchema), c.register);
r.post('/login',    authLimiter, validate(c.schemas.loginSchema), c.login);
r.post('/logout',   c.logout);
r.get('/me',        requireAuth, c.me);
r.post('/reset/request', resetLimiter, authLimiter, c.requestReset);
r.post('/reset/confirm', authLimiter, c.resetPassword);
r.delete('/account', requireAuth, c.deleteAccount);

module.exports = r;