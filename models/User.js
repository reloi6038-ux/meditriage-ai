const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true },
  displayName: { type: String, trim: true, maxlength: 60 },
  role: { type: String, enum: ['user','admin'], default: 'user', index: true },
  lastLoginAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
}, { timestamps: true });

userSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.statics.hashPassword = async function (plain) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => { delete ret.passwordHash; delete ret.passwordResetToken; delete ret.passwordResetExpires; return ret; },
});

module.exports = mongoose.model('User', userSchema);