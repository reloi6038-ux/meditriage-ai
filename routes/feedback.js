const r = require('express').Router();
const c = require('../controllers/feedbackController');
const validate = require('../middleware/validate');
r.post('/', validate(c.schema), c.create);
module.exports = r;