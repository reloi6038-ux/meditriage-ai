const mongoose = require('mongoose');

const vitalsSchema = new mongoose.Schema({
  tempC:       { type: Number, min: 25, max: 45 },
  heartRate:   { type: Number, min: 20, max: 250 },
  respRate:    { type: Number, min: 4,  max: 80 },
  spo2:        { type: Number, min: 50, max: 100 },
  systolicBP:  { type: Number, min: 40, max: 300 },
  diastolicBP: { type: Number, min: 20, max: 200 },
  glucose:     { type: Number, min: 1,  max: 40 },
  painScore:   { type: Number, min: 0,  max: 10 },
  avpu:        { type: String, enum: ['alert','voice','pain','unresponsive'] },
}, { _id: false });

const assessmentSchema = new mongoose.Schema({
  reference:   { type: String, required: true, unique: true, index: true },  // MTA-XXXXX-XXXX
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

  // Patient context (existing + new)
  ageBucket:   { type: String, enum: ['<1','1-4','5-17','18-39','40-64','65+'], required: true },
  sex:         { type: String, enum: ['male','female','other','unknown'], default: 'unknown' },
  pregnancy:   { type: String, enum: ['not_applicable','no','yes_first','yes_second','yes_third','postpartum'], default: 'not_applicable' },
  conditions:  [String],
  medications: [{ name: String, dose: String, frequency: String }],
  allergies:   [String],
  previousEpisodes: { type: Boolean, default: false },
  previousEpisodeNotes: { type: String, maxlength: 300 },

  // Clinical
  clinical:    [String],
  symptoms:    [String],
  redFlags:    [String],
  onset:       { type: String, enum: ['sudden','today','1-3_days','4-7_days','over_week'] },
  progression: { type: String, enum: ['improving','stable','worsening','unknown'], default: 'unknown' },
  severity:    { type: String, enum: ['mild','moderate','severe','unknown'], default: 'unknown' },
  durationHours: { type: Number, min: 0, max: 8760 },
  notes:       { type: String, maxlength: 500 },
  vitals:      vitalsSchema,

  result: {
    urgency:     { type: String, enum: ['EMERGENCY','URGENT','SEMI_URGENT','NON_URGENT','SELF_CARE'], required: true },
    emergency:   Boolean,
    confidence:  Number,
    score:       Number,
    reasons:     [String],
    factors:     [String],
    action:      String,
    timeframe:   String,
    watchFor:    [String],
    probabilities: mongoose.Schema.Types.Mixed,
  },
  emergencyEscalated: { type: Boolean, default: false },
  emergencyReason:    String,
  aiSummary:   String,

  engineVersion: { type: String, default: '2.1.0-clinical' },
  ruleVersion:   { type: Number, default: 1 },
}, { timestamps: true });

assessmentSchema.index({ createdAt: -1 });
assessmentSchema.index({ 'result.urgency': 1 });
assessmentSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Assessment', assessmentSchema);