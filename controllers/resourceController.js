const EmergencyResource = require('../models/EmergencyResource');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const q = { enabled: true };
  if (req.query.country) q.country = req.query.country;
  if (req.query.region) q.region = req.query.region;
  const items = await EmergencyResource.find(q).sort({ country: 1, serviceName: 1 }).lean();
  res.json({ success: true, data: items });
});