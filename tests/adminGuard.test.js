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

test('admin stats require authentication', async () => {
  const r = await request(app).get('/api/v1/admin/stats');
  expect(r.status).toBe(401);
});

test('public resource directory is accessible without auth', async () => {
  const r = await request(app).get('/api/v1/resources');
  expect(r.status).toBe(200);
  expect(Array.isArray(r.body.data)).toBe(true);
});