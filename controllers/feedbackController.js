const Joi = require('joi');
const Feedback = require('../models/Feedback');
const asyncHandler = require('../utils/asyncHandler');

const schema = Joi.object({
  assessmentId: Joi.string().hex().length(24),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().max(500).allow(''),
  outcome: Joi.string().valid('matched','over_triaged','under_triaged','unknown').default('unknown'),
});
exports.schema = schema;

exports.create = asyncHandler(async (req, res) => {
  const doc = await Feedback.create(req.body);
  res.status(201).json({ success: true, data: { id: doc._id } });
});