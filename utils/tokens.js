const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');

function signUser(user) {
  return jwt.sign(
    { sub: String(user._id), role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
module.exports = { signUser, verifyToken };