const r = require('express').Router();
const c = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');

r.use(requireAdmin);

r.get('/stats', c.stats);
r.get('/users', c.listUsers);
r.delete('/users/:id', c.deleteUser);

r.get('/rules', c.listRules);
r.post('/rules', validate(c.ruleSchema), c.createRule);
r.put('/rules/:id', validate(c.ruleSchema), c.updateRule);
r.delete('/rules/:id', c.deleteRule);

r.get('/resources', c.listResources);
r.post('/resources', validate(c.resSchema), c.createResource);
r.put('/resources/:id', validate(c.resSchema), c.updateResource);
r.delete('/resources/:id', c.deleteResource);

r.get('/audit', c.listAudit);

module.exports = r;