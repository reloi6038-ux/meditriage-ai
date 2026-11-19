const r = require('express').Router();
const c = require('../controllers/resourceController');
r.get('/', c.list);
module.exports = r;