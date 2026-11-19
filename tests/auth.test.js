const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const connectDB = require('../db/mongo');
const User = require('../models/User');

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  try { await User.deleteMany({ email: /test-auth/ }); } catch (_) {}
  await mongoose.connection.close();
});

test('register returns token', async () => {
  const r = await request(app).post('/api/v1/auth/register').send({
    email: 'test-auth1@example.com',
    password: 'Password123!',
  });
  expect(r.status).toBe(201);
  expect(r.body.data.token).toBeDefined();
});

test('login returns token', async () => {
  const r = await request(app).post('/api/v1/auth/login').send({
    email: 'test-auth1@example.com',
    password: 'Password123!',
  });
  expect(r.status).toBe(200);
  expect(r.body.data.token).toBeDefined();
});

test('login with wrong password rejected', async () => {
  const r = await request(app).post('/api/v1/auth/login').send({
    email: 'test-auth1@example.com',
    password: 'wrong',
  });
  expect(r.status).toBe(401);
});

test('/me requires auth', async () => {
  const r = await request(app).get('/api/v1/auth/me');
  expect(r.status).toBe(401);
});