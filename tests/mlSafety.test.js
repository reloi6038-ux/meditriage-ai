const mongoose = require('mongoose');
const connectDB = require('../db/mongo');
const { triage } = require('../engine');

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await mongoose.connection.close(); });

test('ML must not escalate mild symptoms to EMERGENCY', async () => {
  const r = await triage({
    ageBucket: '18-39',
    symptoms: ['runny_nose', 'sore_throat'],
    vitals: {},
  });
  expect(r.emergency).toBe(false);
  expect(r.urgency).not.toBe('EMERGENCY');
  expect(r.urgency).not.toBe('URGENT');
});

test('ML must not downgrade a red-flag EMERGENCY', async () => {
  const r = await triage({
    ageBucket: '40-64',
    symptoms: ['chest_pain'],
    redFlags: ['severe_chest_pain'],
    vitals: { spo2: 88 },
  });
  expect(r.urgency).toBe('EMERGENCY');
  expect(r.emergency).toBe(true);
});

test('ML may nudge borderline case by 1 rank, never more', async () => {
  // score = fever(3) = 3 → NON_URGENT, borderline (|3-3|<=1)
  const r = await triage({
    ageBucket: '18-39',
    symptoms: ['fever'],
    vitals: { tempC: 38.5 },
  });
  // NON_URGENT, SEMI_URGENT, or SELF_CARE are all acceptable;
  // URGENT / EMERGENCY are NOT.
  expect(['SELF_CARE','NON_URGENT','SEMI_URGENT']).toContain(r.urgency);
  expect(r.emergency).toBe(false);
});