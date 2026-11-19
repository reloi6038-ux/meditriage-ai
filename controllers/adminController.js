const Joi = require('joi');
const Assessment = require('../models/Assessment');
const User = require('../models/User');
const ClinicalRule = require('../models/ClinicalRule');
const EmergencyResource = require('../models/EmergencyResource');
const Audit = require('../models/Audit');
const asyncHandler = require('../utils/asyncHandler');
const { invalidateCache } = require('../engine/dynamicRules');
const audit = require('../services/auditService');

// ---- Dashboard stats ----
exports.stats = asyncHandler(async (req, res) => {
  const [total, byUrgency, recent, daily, symptoms, users] = await Promise.all([
    Assessment.countDocuments(),
    Assessment.aggregate([{ $group: { _id: '$result.urgency', count: { $sum: 1 } } }]),
    Assessment.find({}, { reference: 1, 'result.urgency': 1, createdAt: 1 })
      .sort({ createdAt: -1 }).limit(10).lean(),
    Assessment.aggregate([
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }, { $limit: 30 },
    ]),
    Assessment.aggregate([
      { $unwind: '$symptoms' },
      { $group: { _id: '$symptoms', count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 10 },
    ]),
    User.countDocuments(),
  ]);
  res.json({ success: true, data: { total, byUrgency, recent, daily, topSymptoms: symptoms, userCount: users } });
});

// ---- Users ----
exports.listUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}, { passwordHash: 0, passwordResetToken: 0, passwordResetExpires: 0 })
    .sort({ createdAt: -1 }).limit(200).lean();
  res.json({ success: true, data: users });
});

exports.deleteUser = asyncHandler(async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) { const e = new Error('Not found'); e.status = 404; throw e; }
  if (u.role === 'admin') { const e = new Error('Cannot delete admin users'); e.status = 400; throw e; }
  await Assessment.deleteMany({ userId: u._id });
  await u.deleteOne();
  audit.log('admin.user.delete', { email: u.email, actor: req.user._id });
  res.json({ success: true, data: { ok: true } });
});

// ---- Clinical rules ----
const ruleSchema = Joi.object({
  name: Joi.string().max(100).required(),
  description: Joi.string().max(300).allow(''),
  priority: Joi.number().min(1).max(100).default(50),
  enabled: Joi.boolean().default(true),
  urgency: Joi.string().valid('EMERGENCY','URGENT','SEMI_URGENT','NON_URGENT','SELF_CARE').required(),
  anySymptoms: Joi.array().items(Joi.string().max(50)).default([]),
  allSymptoms: Joi.array().items(Joi.string().max(50)).default([]),
  anyRedFlags: Joi.array().items(Joi.string().max(50)).default([]),
  minTempC: Joi.number().allow(null), maxTempC: Joi.number().allow(null),
  minHeartRate: Joi.number().allow(null), maxHeartRate: Joi.number().allow(null),
  minSysBP: Joi.number().allow(null), maxSysBP: Joi.number().allow(null),
  minSpO2: Joi.number().allow(null), maxSpO2: Joi.number().allow(null),
  minRespRate: Joi.number().allow(null), maxRespRate: Joi.number().allow(null),
  action: Joi.string().max(200).allow(''),
  timeframe: Joi.string().max(60).allow(''),
  watchFor: Joi.array().items(Joi.string().max(120)).default([]),
});
exports.ruleSchema = ruleSchema;

exports.listRules = asyncHandler(async (req, res) => {
  const rules = await ClinicalRule.find().sort({ priority: -1, createdAt: -1 }).lean();
  res.json({ success: true, data: rules });
});

exports.createRule = asyncHandler(async (req, res) => {
  const rule = await ClinicalRule.create({ ...req.body, changeLog: [{ at: new Date(), by: req.user.email, summary: 'created' }] });
  invalidateCache();
  audit.log('admin.rule.create', { name: rule.name, actor: req.user._id });
  res.status(201).json({ success: true, data: rule });
});

exports.updateRule = asyncHandler(async (req, res) => {
  const rule = await ClinicalRule.findById(req.params.id);
  if (!rule) { const e = new Error('Not found'); e.status = 404; throw e; }
  Object.assign(rule, req.body);
  rule.version = (rule.version || 1) + 1;
  rule.changeLog = [...(rule.changeLog || []), { at: new Date(), by: req.user.email, summary: 'updated' }];
  await rule.save();
  invalidateCache();
  audit.log('admin.rule.update', { name: rule.name, actor: req.user._id });
  res.json({ success: true, data: rule });
});

exports.deleteRule = asyncHandler(async (req, res) => {
  const rule = await ClinicalRule.findByIdAndDelete(req.params.id);
  if (!rule) { const e = new Error('Not found'); e.status = 404; throw e; }
  invalidateCache();
  audit.log('admin.rule.delete', { name: rule.name, actor: req.user._id });
  res.json({ success: true, data: { ok: true } });
});

// ---- Emergency resources ----
const resSchema = Joi.object({
  country: Joi.string().max(60).required(),
  region: Joi.string().max(60).allow(''),
  serviceName: Joi.string().max(80).required(),
  phone: Joi.string().max(40).required(),
  facility: Joi.string().max(120).allow(''),
  address: Joi.string().max(200).allow(''),
  website: Joi.string().uri().allow(''),
  availability: Joi.string().max(40).default('24/7'),
  enabled: Joi.boolean().default(true),
});
exports.resSchema = resSchema;

exports.listResources = asyncHandler(async (req, res) => {
  const q = {};
  if (req.query.country) q.country = req.query.country;
  const items = await EmergencyResource.find(q).sort({ country: 1, serviceName: 1 }).lean();
  res.json({ success: true, data: items });
});

exports.createResource = asyncHandler(async (req, res) => {
  const r = await EmergencyResource.create(req.body);
  audit.log('admin.resource.create', { name: r.serviceName, actor: req.user._id });
  res.status(201).json({ success: true, data: r });
});

exports.updateResource = asyncHandler(async (req, res) => {
  const r = await EmergencyResource.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!r) { const e = new Error('Not found'); e.status = 404; throw e; }
  audit.log('admin.resource.update', { name: r.serviceName, actor: req.user._id });
  res.json({ success: true, data: r });
});

exports.deleteResource = asyncHandler(async (req, res) => {
  const r = await EmergencyResource.findByIdAndDelete(req.params.id);
  if (!r) { const e = new Error('Not found'); e.status = 404; throw e; }
  audit.log('admin.resource.delete', { name: r.serviceName, actor: req.user._id });
  res.json({ success: true, data: { ok: true } });
});

// ---- Audit log ----
exports.listAudit = asyncHandler(async (req, res) => {
  const items = await Audit.find().sort({ createdAt: -1 }).limit(200).lean();
  res.json({ success: true, data: items });
});