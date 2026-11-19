const r = require('express').Router();
const c = require('../controllers/assessmentController');
const validate = require('../middleware/validate');

r.post('/', validate(c.schema), c.create);
r.get('/recent-public', c.recentPublic);
r.get('/by-ref/:ref', c.getByReference);
r.get('/:id', c.getOne);
r.get('/', c.list);
r.delete('/:id', c.removeOne);

module.exports = r;