const Audit = require('../models/Audit');
exports.log = async (action, meta = {}) => {
  try { await Audit.create({ action, ...meta }); } catch (_) {}
};