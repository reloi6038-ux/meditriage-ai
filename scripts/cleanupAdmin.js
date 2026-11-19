require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const r = await User.deleteMany({
    email: { $in: ['admin@meditriage.local'] }
  });
  console.log('  Removed ' + r.deletedCount + ' old admin user(s).');
  await mongoose.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });