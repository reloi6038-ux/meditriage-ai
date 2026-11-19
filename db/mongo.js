const mongoose = require('mongoose');
const { MONGODB_URI, NODE_ENV } = require('../config/env');
async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  if (NODE_ENV !== 'test') console.log('MongoDB connected');
}
module.exports = connectDB;
