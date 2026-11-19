const r = require('express').Router();
const c = require('../controllers/healthController');
r.get('/', c.health);
module.exports = r;
