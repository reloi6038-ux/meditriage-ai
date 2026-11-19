const fs = require('fs');
const path = require('path');
const Assessment = require('../models/Assessment');

exports.metrics = (req, res) => {
  const p = path.join(__dirname, '..', 'evaluation', 'metrics.json');
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  res.json({ success: true, data });
};

exports.dashboard = async (req, res, next) => {
  try {
    const total = await Assessment.countDocuments();
    const byUrgency = await Assessment.aggregate([
      { $group: { _id: '$result.urgency', count: { $sum: 1 } } },
    ]);
    const recent = await Assessment.find({}, { result: 1, createdAt: 1 })
      .sort({ createdAt: -1 }).limit(20).lean();
    const daily = await Assessment.aggregate([
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }, { $limit: 30 },
    ]);
    res.json({ success: true, data: { total, byUrgency, recent, daily } });
  } catch (e) { next(e); }
};
