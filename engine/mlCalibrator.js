const fs = require('fs');
const path = require('path');
const model = JSON.parse(fs.readFileSync(path.join(__dirname, 'model.json'), 'utf8'));
const CLASSES = ['EMERGENCY','URGENT','SEMI_URGENT','NON_URGENT','SELF_CARE'];

function featurize(input) {
  const { symptoms = [], vitals = {}, ageBucket = '18-39', sex = 'unknown' } = input;
  const { SYMPTOMS } = require('./symptoms');
  const f = {};
  for (const k of Object.keys(SYMPTOMS)) f[`s_${k}`] = symptoms.includes(k) ? 1 : 0;
  f['age_<1'] = ageBucket === '<1' ? 1 : 0;
  f['age_1-4'] = ageBucket === '1-4' ? 1 : 0;
  f['age_5-17'] = ageBucket === '5-17' ? 1 : 0;
  f['age_18-39'] = ageBucket === '18-39' ? 1 : 0;
  f['age_40-64'] = ageBucket === '40-64' ? 1 : 0;
  f['age_65+'] = ageBucket === '65+' ? 1 : 0;
  f.sex_female = sex === 'female' ? 1 : 0;
  f.sex_male = sex === 'male' ? 1 : 0;
  f.has_fever = (vitals.tempC ?? 0) >= 38 ? 1 : 0;
  f.hypoxia = (vitals.spo2 ?? 100) < 94 ? 1 : 0;
  f.hypotension = (vitals.systolicBP ?? 120) < 100 ? 1 : 0;
  f.tachycardia = (vitals.heartRate ?? 80) > 100 ? 1 : 0;
  f.tachypnea = (vitals.respRate ?? 18) > 22 ? 1 : 0;
  f.symptom_count = symptoms.length / 10;
  return f;
}
function softmax(scores) {
  const m = Math.max(...scores);
  const e = scores.map(v => Math.exp(v - m));
  const z = e.reduce((a, b) => a + b, 0);
  return e.map(v => v / z);
}
function predict(input) {
  const f = featurize(input);
  const logits = CLASSES.map((_, i) => {
    const w = model.weights[i];
    const keys = Object.keys(f);
    let s = model.biases[i];
    for (const k of keys) { const wi = w[k]; if (wi !== undefined) s += wi * f[k]; }
    return s;
  });
  const probs = softmax(logits);
  const idx = probs.indexOf(Math.max(...probs));
  return {
    class: CLASSES[idx],
    probabilities: Object.fromEntries(CLASSES.map((c, i) => [c, +probs[i].toFixed(4)])),
    confidence: +probs[idx].toFixed(4),
  };
}
module.exports = { predict, CLASSES };
