const rateLimit = require('express-rate-limit');
const { RATE_MAX } = require('../config/env');
module.exports = rateLimit({
  windowMs: 60 * 1000,
  max: RATE_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please slow down.' },
});