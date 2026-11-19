require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');

const { PORT, NODE_ENV } = require('./config/env');
const connectDB = require('./db/mongo');
const routes = require('./routes');
const { attachUser } = require('./middleware/auth');
const rateLimiter = require('./middleware/rateLimiter');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true }));
app.use(compression());
app.use(express.json({ limit: '64kb' }));
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

// Attach user (does not require auth — just parses the JWT if present)
app.use(attachUser);

app.use('/api', rateLimiter);
app.use('/api/v1', routes);

app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.use(notFound);
app.use(errorHandler);

async function start() {
  await connectDB();
  app.listen(PORT, () => console.log(`MediTriage AI running on port ${PORT}`));
}

if (require.main === module) {
  start().catch(err => { console.error(err); process.exit(1); });
}

module.exports = app;