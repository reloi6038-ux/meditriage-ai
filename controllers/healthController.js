const mongoose = require('mongoose');
exports.health = (req, res) => res.json({
  success: true,
  data: {
    status: 'ok',
    uptime: process.uptime(),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    time: new Date().toISOString(),
  },
});
