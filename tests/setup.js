// Global Jest setup — starts in-memory MongoDB, sets MONGODB_URI,
// and provides a hard teardown so Jest can exit cleanly.
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo;

module.exports = async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri('meditriage_test');
  process.env.NODE_ENV = 'test';
  // eslint-disable-next-line no-console
  console.log('[jest] in-memory MongoDB at', process.env.MONGODB_URI);

  return async () => {
    // Close any open mongoose connection before stopping the server
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
    } catch (_) { /* mongoose not yet loaded */ }
    await mongo.stop();
  };
};