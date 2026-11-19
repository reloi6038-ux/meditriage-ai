const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  country:     { type: String, required: true, index: true },
  region:      { type: String, index: true },
  serviceName: { type: String, required: true },     // "Ambulance", "Police", "Poison Control"
  phone:       { type: String, required: true },
  facility:    String,
  address:     String,
  website:     String,
  availability:{ type: String, default: '24/7' },
  enabled:     { type: Boolean, default: true, index: true },
}, { timestamps: true });

resourceSchema.index({ country: 1, region: 1, enabled: 1 });

module.exports = mongoose.model('EmergencyResource', resourceSchema);