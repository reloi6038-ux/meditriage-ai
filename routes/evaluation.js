const r = require('express').Router();
const c = require('../controllers/evaluationController');
r.get('/', c.metrics);
r.get('/dashboard', c.dashboard);
module.exports = r;
