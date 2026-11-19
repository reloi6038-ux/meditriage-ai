const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true, trim: true },
  description: String,
  priority:    { type: Number, default: 50, min: 1, max: 100 },  // higher wins
  enabled:     { type: Boolean, default: true, index: true },
  urgency:     { type: String, enum: ['EMERGENCY','URGENT','SEMI_URGENT','NON_URGENT','SELF_CARE'], required: true },

  // Trigger conditions (all must match)
  anySymptoms:  [String],       // at least one of these symptoms
  allSymptoms:  [String],       // all of these symptoms
  anyRedFlags:  [String],       // at least one of these red flags
  minTempC:     Number,
  maxTempC:     Number,
  minHeartRate: Number,
  maxHeartRate: Number,
  minSysBP:     Number,
  maxSysBP:     Number,
  minSpO2:      Number,
  maxSpO2:      Number,
  minRespRate:  Number,
  maxRespRate:  Number,

  // Output
  action:    String,
  timeframe: String,
  watchFor:  [String],

  version:      { type: Number, default: 1 },
  changeLog:    [{ at: Date, by: String, summary: String }],
}, { timestamps: true });

module.exports = mongoose.model('ClinicalRule', ruleSchema);