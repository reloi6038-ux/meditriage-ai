require('dotenv').config();
const mongoose = require('mongoose');
const EmergencyResource = require('../models/EmergencyResource');

const RESOURCES = [
  // Global / international defaults
  { country: 'International', region: '', serviceName: 'Emergency (international)', phone: '112',      availability: '24/7' },

  // United States
  { country: 'United States', region: '', serviceName: 'Emergency (911)',          phone: '911',      availability: '24/7' },
  { country: 'United States', region: '', serviceName: 'Poison Control',           phone: '1-800-222-1222', availability: '24/7' },
  { country: 'United States', region: '', serviceName: 'Suicide & Crisis Lifeline',phone: '988',      availability: '24/7' },

  // United Kingdom
  { country: 'United Kingdom', region: '', serviceName: 'Emergency (999)',         phone: '999',      availability: '24/7' },
  { country: 'United Kingdom', region: '', serviceName: 'NHS Non-Emergency',       phone: '111',      availability: '24/7' },

  // European Union
  { country: 'European Union', region: '', serviceName: 'Emergency (EU-wide)',     phone: '112',      availability: '24/7' },

  // Nigeria
  { country: 'Nigeria', region: '', serviceName: 'Emergency (NEMA)',               phone: '112',      availability: '24/7' },
  { country: 'Nigeria', region: 'Lagos', serviceName: 'Lagos Emergency',           phone: '767',      availability: '24/7' },

  // India
  { country: 'India', region: '', serviceName: 'Emergency (Ambulance)',            phone: '108',      availability: '24/7' },
  { country: 'India', region: '', serviceName: 'Emergency (All services)',         phone: '112',      availability: '24/7' },

  // Canada
  { country: 'Canada', region: '', serviceName: 'Emergency (911)',                 phone: '911',      availability: '24/7' },

  // Australia
  { country: 'Australia', region: '', serviceName: 'Emergency (000)',              phone: '000',      availability: '24/7' },

  // Kenya
  { country: 'Kenya', region: '', serviceName: 'Emergency (999)',                  phone: '999',      availability: '24/7' },

  // South Africa
  { country: 'South Africa', region: '', serviceName: 'Emergency (10111)',         phone: '10111',    availability: '24/7' },
];

(async () => {
  if (!process.env.MONGODB_URI) { console.error('MONGODB_URI missing'); process.exit(1); }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected. Seeding emergency resources...');

  let inserted = 0, skipped = 0;
  for (const r of RESOURCES) {
    const exists = await EmergencyResource.findOne({
      country: r.country,
      region: r.region || '',
      serviceName: r.serviceName,
    });
    if (exists) { skipped++; continue; }
    await EmergencyResource.create({ ...r, enabled: true });
    inserted++;
  }

  console.log(`Seeded ${inserted} new resources (${skipped} already existed).`);
  await mongoose.disconnect();
})().catch(err => { console.error(err); process.exit(1); });