// MONGODB_URI + NODE_ENV are set by tests/setup.js (in-memory MongoDB).
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const connectDB = require('../db/mongo');

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.close();
});

test('health endpoint returns ok', async () => {
  const r = await request(app).get('/api/v1/health');
  expect(r.status).toBe(200);
  expect(r.body.data.status).toBe('ok');
});

test('validation rejects empty body with 422', async () => {
  const r = await request(app).post('/api/v1/assessments').send({});
  expect(r.status).toBe(422);
});

test('valid assessment returns 201 with reference and urgency', async () => {
  const r = await request(app)
    .post('/api/v1/assessments')
    .send({ ageBucket: '18-39', symptoms: ['fever'], vitals: { tempC: 38.5 } });
  expect(r.status).toBe(201);
  expect(r.body.data.urgency).toBeDefined();
  expect(r.body.data.reference).toMatch(/^MTA-/);
});