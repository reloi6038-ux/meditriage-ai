const mongoose = require('mongoose');
const connectDB = require('../db/mongo');
const { triage } = require('../engine');

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.close();
});

test('red flag forces EMERGENCY', async () => {
  const r = await triage({
    ageBucket: '40-64',
    symptoms: ['chest_pain', 'shortness_of_breath'],
    vitals: { spo2: 88 },
  });
  expect(r.urgency).toBe('EMERGENCY');
  expect(r.emergency).toBe(true);
});

test('mild symptoms produce non-emergency', async () => {
  const r = await triage({
    ageBucket: '18-39',
    symptoms: ['runny_nose', 'sore_throat'],
    vitals: {},
  });
  expect(r.emergency).toBe(false);
  expect(['SELF_CARE', 'NON_URGENT', 'SEMI_URGENT']).toContain(r.urgency);
});

test('deterministic on same input', async () => {
  const a = await triage({ ageBucket: '18-39', symptoms: ['fever'], vitals: { tempC: 38.5 } });
  const b = await triage({ ageBucket: '18-39', symptoms: ['fever'], vitals: { tempC: 38.5 } });
  expect(a.urgency).toBe(b.urgency);
});

test('seizure alone triggers emergency', async () => {
  const r = await triage({ ageBucket: '40-64', symptoms: ['seizure'], vitals: {} });
  expect(r.urgency).toBe('EMERGENCY');
});