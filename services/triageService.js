const { triage } = require('../engine');
const { buildAISummary } = require('../engine/aiSupport');

async function runTriage(input) {
  const result = await triage(input);
  const ai = buildAISummary(result, input);
  return { result, ai };
}

module.exports = { runTriage };