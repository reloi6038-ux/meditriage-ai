const Joi = require('joi');
const Assessment = require('../models/Assessment');
const { runTriage } = require('../services/triageService');
const asyncHandler = require('../utils/asyncHandler');
const { genRef } = require('../utils/reference');
const audit = require('../services/auditService');

const schema = Joi.object({
  ageBucket: Joi.string().valid('<1','1-4','5-17','18-39','40-64','65+').required(),
  sex: Joi.string().valid('male','female','other','unknown').default('unknown'),
  pregnancy: Joi.string().valid('not_applicable','no','yes_first','yes_second','yes_third','postpartum').default('not_applicable'),
  conditions: Joi.array().items(Joi.string().max(40)).max(20).default([]),
  medications: Joi.array().items(Joi.object({
    name: Joi.string().max(80).required(),
    dose: Joi.string().max(40).allow(''),
    frequency: Joi.string().max(40).allow(''),
  })).max(20).default([]),
  allergies: Joi.array().items(Joi.string().max(80)).max(20).default([]),
  previousEpisodes: Joi.boolean().default(false),
  previousEpisodeNotes: Joi.string().max(300).allow('').optional(),
  clinical: Joi.array().items(Joi.string().max(40)).max(20).default([]),
  symptoms: Joi.array().items(Joi.string().max(50)).max(30).default([]),
  redFlags: Joi.array().items(Joi.string().max(50)).max(30).default([]),
  onset: Joi.string().valid('sudden','today','1-3_days','4-7_days','over_week').optional(),
  progression: Joi.string().valid('improving','stable','worsening','unknown').default('unknown'),
  severity: Joi.string().valid('mild','moderate','severe','unknown').default('unknown'),
  durationHours: Joi.number().min(0).max(8760).optional(),
  notes: Joi.string().max(500).allow('').optional(),
  vitals: Joi.object({
    tempC: Joi.number().min(25).max(45),
    heartRate: Joi.number().min(20).max(250),
    respRate: Joi.number().min(4).max(80),
    spo2: Joi.number().min(50).max(100),
    systolicBP: Joi.number().min(40).max(300),
    diastolicBP: Joi.number().min(20).max(200),
    glucose: Joi.number().min(1).max(40),
    painScore: Joi.number().min(0).max(10),
    avpu: Joi.string().valid('alert','voice','pain','unresponsive'),
  }).default({}),
}).custom((value, helpers) => {
  if ((!value.symptoms || value.symptoms.length === 0) &&
      (!value.redFlags || value.redFlags.length === 0)) {
    return helpers.error('any.custom', { message: 'At least one symptom or danger sign is required.' });
  }
  return value;
});

exports.schema = schema;

exports.create = asyncHandler(async (req, res) => {
  const input = req.body;
  const { result, ai } = await runTriage(input);

  const doc = await Assessment.create({
    reference: genRef(),
    userId: req.user?._id,
    ageBucket: input.ageBucket,
    sex: input.sex,
    pregnancy: input.pregnancy,
    conditions: input.conditions,
    medications: input.medications,
    allergies: input.allergies,
    previousEpisodes: input.previousEpisodes,
    previousEpisodeNotes: input.previousEpisodeNotes,
    clinical: input.clinical,
    symptoms: input.symptoms,
    redFlags: input.redFlags.length ? input.redFlags : result.redFlags,
    onset: input.onset,
    progression: input.progression,
    severity: input.severity,
    durationHours: input.durationHours,
    notes: input.notes,
    vitals: input.vitals,
    result: {
      urgency: result.urgency,
      emergency: result.emergency,
      confidence: result.confidence,
      score: result.score,
      reasons: result.reasons,
      factors: result.factors,
      action: result.action,
      timeframe: result.timeframe,
      watchFor: result.watchFor,
      probabilities: result.probabilities,
    },
    emergencyEscalated: result.emergency,
    emergencyReason: result.emergency ? (result.redFlags[0] || 'Emergency criteria met') : undefined,
    aiSummary: ai.summary,
  });

  audit.log('assessment.create', {
    reference: doc.reference,
    urgency: doc.result.urgency,
    actor: req.user?._id,
  });

  res.status(201).json({
    success: true,
    data: {
      id: doc._id,
      reference: doc.reference,
      ...result,
      ai,
      createdAt: doc.createdAt,
    },
  });
});

exports.getOne = asyncHandler(async (req, res) => {
  const doc = await Assessment.findById(req.params.id).lean();
  if (!doc) { const e = new Error('Not found'); e.status = 404; throw e; }
  res.json({ success: true, data: doc });
});

exports.getByReference = asyncHandler(async (req, res) => {
  const doc = await Assessment.findOne({ reference: req.params.ref }).lean();
  if (!doc) { const e = new Error('Not found'); e.status = 404; throw e; }
  res.json({ success: true, data: doc });
});

exports.list = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const q = {};
  if (req.user) {
    if (req.user.role !== 'admin') q.userId = req.user._id;
  } else {
    // Anonymous: no list access to others' records. Return empty to avoid data leak.
    return res.json({ success: true, data: [] });
  }
  if (req.query.urgency) q['result.urgency'] = req.query.urgency;
  if (req.query.q) {
    const re = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    q.$or = [{ reference: re }, { notes: re }];
  }
  const docs = await Assessment.find(q, { symptoms: 0, vitals: 0, notes: 0 })
    .sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ success: true, data: docs });
});

exports.removeOne = asyncHandler(async (req, res) => {
  const doc = await Assessment.findById(req.params.id);
  if (!doc) { const e = new Error('Not found'); e.status = 404; throw e; }
  if (doc.userId && req.user?.role !== 'admin' && String(doc.userId) !== String(req.user?._id)) {
    const e = new Error('Forbidden'); e.status = 403; throw e;
  }
  await doc.deleteOne();
  audit.log('assessment.delete', { reference: doc.reference, actor: req.user?._id });
  res.json({ success: true, data: { ok: true } });
});

// Public recent (no PII, no fields that identify anyone)
exports.recentPublic = asyncHandler(async (req, res) => {
  const docs = await Assessment.find({},
    { reference: 0, notes: 0, medications: 0, allergies: 0, symptoms: 0, vitals: 0,
      'result.reasons': 0, 'result.probabilities': 0, aiSummary: 0 })
    .sort({ createdAt: -1 }).limit(10).lean();
  res.json({ success: true, data: docs });
});