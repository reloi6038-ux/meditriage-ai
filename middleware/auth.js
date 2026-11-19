const User = require('../models/User');
const { verifyToken } = require('../utils/tokens');

async function attachUser(req, res, next) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return next();
  try {
    const payload = verifyToken(h.slice(7));
    const user = await User.findById(payload.sub).lean();
    if (user) { delete user.passwordHash; req.user = user; }
  } catch (_) { /* ignore invalid token — treated as anonymous */ }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin access required' });
  next();
}

module.exports = { attachUser, requireAuth, requireAdmin };