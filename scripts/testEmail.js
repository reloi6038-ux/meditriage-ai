require('dotenv').config();
const mail = require('../services/mailService');
const { SMTP_HOST, SMTP_USER, SMTP_FROM, APP_BASE_URL } = require('../config/env');

(async () => {
  console.log('\n=== SMTP configuration check ===');
  console.log('  SMTP_HOST     :', SMTP_HOST || '(not set)');
  console.log('  SMTP_USER     :', SMTP_USER || '(not set)');
  console.log('  SMTP_FROM     :', SMTP_FROM || '(not set)');
  console.log('  APP_BASE_URL  :', APP_BASE_URL);

  if (!mail.smtpConfigured()) {
    console.error('\n❌ SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env.');
    process.exit(1);
  }

  console.log('\nVerifying SMTP connection...');
  const v = await mail.verifyTransport();
  if (!v.ok) { console.error('❌ SMTP verify failed:', v.error); process.exit(1); }
  console.log('✅ SMTP connection OK');

  const to = process.argv[2];
  if (!to) {
    console.log('\n(No recipient given — skipping send.)');
    console.log('To send a test email: node scripts/testEmail.js you@example.com');
    process.exit(0);
  }

  console.log(`\nSending test email to ${to}...`);
  const result = await mail.sendMail({
    to,
    subject: 'MediTriage AI — SMTP test',
    text: 'This is a test email from MediTriage AI. If you see this, SMTP is working.',
    html: '<p>This is a <strong>test email</strong> from <strong>MediTriage AI</strong>. If you see this, SMTP is working.</p>',
  });

  if (!result.ok) { console.error('❌ Send failed:', result.error); process.exit(1); }
  console.log('✅ Email sent. Message ID:', result.messageId);
  if (result.previewUrl) {
    console.log('   Preview (Ethereal):', result.previewUrl);
  }
})().catch(err => { console.error(err); process.exit(1); });