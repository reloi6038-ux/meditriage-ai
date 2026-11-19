const mongoose = require('mongoose');
module.exports = mongoose.model('Audit', new mongoose.Schema({
  action: { type: String, index: true },
  actor:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  ip:     String,
  meta:   mongoose.Schema.Types.Mixed,
}, { timestamps: true }));