# MediTriage AI

Clinical triage decision-support for community health workers and low-resource clinics.
**Not a diagnosis. Not a replacement for a qualified healthcare professional.**

## What it does
Structured clinical intake (WHO/IMCI danger signs + vitals + history) returns a 5-level urgency
recommendation with an emergency flag, reasons, action, timeframe, watch-for signs, a reference
number, and a deterministic, non-diagnostic AI summary.

## Stack
Node.js, Express.js, MongoDB (Mongoose), JWT auth (bcryptjs), Joi, Helmet.
Frontend served by Express from `public/`. Render-ready.

## Local setup
1. Copy `.env.example` to `.env` and set `MONGODB_URI`, `JWT_SECRET`.
2. `npm install`
3. `npm run evaluate`     # trains calibrator + writes real metrics
4. `npm run seed:admin`   # creates admin user from ADMIN_EMAIL/PASSWORD
5. `npm run dev`          # http://localhost:3000
6. `npm test`

## API (v1)

### Public
- `GET    /api/v1/health`
- `GET    /api/v1/evaluation`
- `GET    /api/v1/evaluation/dashboard`
- `GET    /api/v1/resources?country=&region=`
- `POST   /api/v1/assessments`                  (anonymous or authenticated)
- `GET    /api/v1/assessments/by-ref/:ref`
- `GET    /api/v1/assessments/recent-public`
- `POST   /api/v1/feedback`

### Auth
- `POST   /api/v1/auth/register`
- `POST   /api/v1/auth/login`
- `POST   /api/v1/auth/logout`
- `GET    /api/v1/auth/me`
- `POST   /api/v1/auth/reset/request`
- `POST   /api/v1/auth/reset/confirm`
- `DELETE /api/v1/auth/account`

### Authenticated user
- `GET    /api/v1/assessments`         (own records)
- `GET    /api/v1/assessments/:id`
- `DELETE /api/v1/assessments/:id`

### Admin (role=admin required)
- `GET    /api/v1/admin/stats`
- `GET    /api/v1/admin/users`   `DELETE /api/v1/admin/users/:id`
- `GET    /api/v1/admin/rules`   `POST`   `PUT :id`   `DELETE :id`
- `GET    /api/v1/admin/resources`   `POST`   `PUT :id`   `DELETE :id`
- `GET    /api/v1/admin/audit`

## Safety
- Emergency rules always outrank every other rule.
- AI layer is deterministic, non-diagnostic, and cannot override the triage result.
- Assessment references are random and do not encode identity.
- No PII is collected by default. Notes fields are limited to 500 chars.

## Clinical rule management
Admins can create, edit, disable, and version clinical rules with priorities. Rules are loaded
by the engine with a 30-second cache. All changes are recorded in the audit log.

## Evaluation
`npm run evaluate` builds a reproducible benchmark, trains the calibrator, and writes
`evaluation/metrics.json`. Numbers are produced by the script, not hard-coded.

## Medical disclaimer
Decision-support only. Not a medical device. In an emergency, call local emergency services.

## License
MIT