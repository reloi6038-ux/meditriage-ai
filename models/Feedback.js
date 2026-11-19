const mongoose = require('mongoose');
module.exports = mongoose.model('Feedback', new mongoose.Schema({
  assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment' },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, maxlength: 500 },
  outcome: { type: String, enum: ['matched','over_triaged','under_triaged','unknown'], default: 'unknown' },
}, { timestamps: true }));
