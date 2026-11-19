const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const connectDB = require('../db/mongo');
const Assessment = require('../models/Assessment');

beforeAll(async () => {
  await connectDB();
  await Assessment.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.close();
});

test('WHO danger sign alone always forces EMERGENCY', async () => {
  const r = await request(app).post('/api/v1/assessments').send({
    ageBucket: '18-39',
    symptoms: [],
    redFlags: ['unable_to_drink'],
    vitals: {},
  });
  expect(r.status).toBe(201);
  expect(r.body.data.urgency).toBe('EMERGENCY');
  expect(r.body.data.emergency).toBe(true);
});

test('low-risk symptoms do not produce EMERGENCY', async () => {
  const r = await request(app).post('/api/v1/assessments').send({
    ageBucket: '18-39',
    symptoms: ['runny_nose', 'sore_throat'],
    vitals: {},
  });
  expect(r.status).toBe(201);
  expect(r.body.data.emergency).toBe(false);
});

test('AI summary never overrides emergency', async () => {
  const r = await request(app).post('/api/v1/assessments').send({
    ageBucket: '40-64',
    symptoms: ['chest_pain', 'shortness_of_breath'],
    redFlags: ['severe_chest_pain'],
    vitals: { spo2: 86 },
  });
  expect(r.status).toBe(201);
  expect(r.body.data.urgency).toBe('EMERGENCY');
  expect(r.body.data.ai).toBeDefined();
  expect(r.body.data.ai.summary).toMatch(/emergency/i);
});

test('assessment reference is generated', async () => {
  const r = await request(app).post('/api/v1/assessments').send({
    ageBucket: '18-39',
    symptoms: ['fever'],
    vitals: {},
  });
  expect(r.status).toBe(201);
  expect(r.body.data.reference).toMatch(/^MTA-/);
});

test('anonymous assessments cannot list other assessments', async () => {
  const r = await request(app).get('/api/v1/assessments');
  expect(r.status).toBe(200);
  expect(Array.isArray(r.body.data)).toBe(true);
  expect(r.body.data.length).toBe(0);
});