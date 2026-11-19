require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { ADMIN_EMAIL, ADMIN_PASSWORD } = require('../config/env');

(async () => {
  if (!process.env.MONGODB_URI) { console.error('MONGODB_URI missing'); process.exit(1); }
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) { console.error('ADMIN_EMAIL / ADMIN_PASSWORD missing'); process.exit(1); }

  await mongoose.connect(process.env.MONGODB_URI);

  let user = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (user) {
    user.role = 'admin';
    user.passwordHash = await User.hashPassword(ADMIN_PASSWORD);
    await user.save();
    console.log('Admin updated:', user.email);
  } else {
    user = await User.create({
      email: ADMIN_EMAIL.toLowerCase(),
      passwordHash: await User.hashPassword(ADMIN_PASSWORD),
      displayName: 'Administrator',
      role: 'admin',
    });
    console.log('Admin created:', user.email);
  }
  await mongoose.disconnect();
})().catch(err => { console.error(err); process.exit(1); });