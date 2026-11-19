module.exports = {
  info: (...a) => console.log('[INFO]', new Date().toISOString(), ...a),
  error: (...a) => console.error('[ERR]', new Date().toISOString(), ...a),
};
