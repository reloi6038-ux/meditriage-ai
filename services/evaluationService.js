const fs = require('fs');
const path = require('path');
exports.getMetrics = () =>
  JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'evaluation', 'metrics.json'), 'utf8'));
