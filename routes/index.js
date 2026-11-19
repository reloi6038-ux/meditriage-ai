const r = require('express').Router();
r.use('/health', require('./health'));
r.use('/auth', require('./auth'));
r.use('/assessments', require('./assessments'));
r.use('/evaluation', require('./evaluation'));
r.use('/feedback', require('./feedback'));
r.use('/resources', require('./resources'));
r.use('/admin', require('./admin'));
module.exports = r;