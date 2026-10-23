#!/usr/bin/env node
/**
 * Checks the Ensis backend environment without printing any secret value.
 *
 *   node scripts/server/check-env.mjs            # checks the running environment (Coolify terminal)
 *   node scripts/server/check-env.mjs .env       # checks a .env file instead
 *
 * Exit code 1 when a required variable is missing or invalid, so it can gate a deploy.
 */
import fs from 'node:fs';

const fileArg = process.argv[2];
let env = process.env;
if (fileArg) {
  if (!fs.existsSync(fileArg)) {
    console.error(`File not found: ${fileArg}`);
    process.exit(2);
  }
  env = {};
  for (const line of fs.readFileSync(fileArg, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const has = (k) => typeof env[k] === 'string' && env[k].trim() !== '' && !/^your_/i.test(env[k].trim());
const first = (...keys) => keys.find(has);
const isProd = (env.NODE_ENV || '').trim() === 'production';

const results = [];
const add = (level, area, msg) => results.push({ level, area, msg });
const need = (area, keys, why) => {
  const k = first(...keys);
  if (k) add('ok', area, `${k} is set`);
  else add('missing', area, `${keys[0]} is not set${keys.length > 1 ? ` (or ${keys.slice(1).join(' / ')})` : ''} - ${why}`);
  return k;
};
const optional = (area, keys, why) => {
  const k = first(...keys);
  if (k) add('ok', area, `${k} is set`);
  else add('warn', area, `${keys[0]} is not set - ${why}`);
  return k;
};

// Core
if (!isProd) add('warn', 'core', `NODE_ENV is "${env.NODE_ENV || ''}" - set NODE_ENV=production on the live server`);
else add('ok', 'core', 'NODE_ENV=production');
need('core', ['MONGO_URI_MAIN'], 'the server cannot start without the database');
need('core', ['JWT_ACCESS_SECRET', 'JWT_SECRET'], 'tokens would be signed with a public default secret');
need('core', ['JWT_REFRESH_SECRET'], 'refresh tokens fall back to a derived secret');
need('core', ['CORS_ORIGIN'], 'the website and admin cannot call the API from the browser');
need('core', ['SITE_URL'], 'email links, the dashboard and the SEO audit use it');
optional('core', ['PORT'], 'defaults to 5000');
if (isProd && (env.COOKIE_SECURE || '').trim() === 'false') add('warn', 'core', 'COOKIE_SECURE=false - login cookies are sent without the Secure flag');

// Email and WhatsApp (OTP, career emails, alerts)
need('email', ['SMTP_HOST'], 'emails are only printed to the console');
need('email', ['SMTP_USER'], 'SMTP login');
need('email', ['SMTP_PASS'], 'SMTP login');
optional('email', ['SMTP_PORT'], 'defaults to 587');
optional('email', ['FROM_EMAIL', 'EMAIL_FROM'], 'sender address');
need('whatsapp', ['OPUS_API_KEY'], 'WhatsApp OTP (admin login and website) is only printed to the console');
optional('whatsapp', ['ADMIN_WHATSAPP_NUMBER'], 'sender number');

// Payments
const rzpId = need('payments', ['RAZORPAY_KEY_ID', 'RAZORPAY_API_KEY', 'RAJORPAY_API_KEY'], 'online payments are disabled');
need('payments', ['RAZORPAY_KEY_SECRET', 'RAZORPAY_TEST_SECRET', 'RAJORPAY_TEST_SECRET'], 'online payments are disabled');
need('payments', ['RAZORPAY_WEBHOOK_SECRET'], 'paid orders stay pending when the customer closes the tab');
if (rzpId && isProd && env[rzpId].trim().startsWith('rzp_test_')) add('missing', 'payments', `${rzpId} is a TEST key (rzp_test_) on production - no real money is collected`);
if (first('RAJORPAY_API_KEY', 'RAJORPAY_TEST_SECRET')) add('warn', 'payments', 'RAJORPAY_* is misspelled - rename to RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET');

// Media
for (const k of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) need('media', [k], 'image uploads fail');

// AI (OpenAI only)
need('ai', ['OPENAI_API_KEY'], 'CV screening, photo check, chatbot, SEO recommendations and infra reports fail');
optional('ai', ['OPENAI_MODEL'], 'defaults to gpt-4o-mini');

// Infrastructure + encrypted secrets
if ((env.INFRASTRUCTURE_ENABLED || '').trim() === 'true') add('ok', 'infra', 'INFRASTRUCTURE_ENABLED=true');
else add('missing', 'infra', 'INFRASTRUCTURE_ENABLED is not "true" - the Infrastructure module and collector ingest are off');
const encKey = need('infra', ['ENCRYPTION_MASTER_KEY'], 'provider credentials, Google integration secrets and GBP tokens cannot be stored');
if (encKey) {
  const bytes = Buffer.from(env[encKey].trim(), 'base64').length;
  if (bytes !== 32) add('missing', 'infra', `ENCRYPTION_MASTER_KEY decodes to ${bytes} bytes, expected 32 (generate: openssl rand -base64 32)`);
}

// Optional integrations
const gbp = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GBP_REDIRECT_URI'].filter(has).length;
if (gbp === 0) add('info', 'google', 'Google Business Profile not configured (Google Reviews page shows "not configured")');
else if (gbp < 3) add('warn', 'google', 'Google Business Profile is partly configured - set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GBP_REDIRECT_URI together');
else add('ok', 'google', 'Google Business Profile OAuth vars are set');

// Leftovers that no longer do anything
for (const k of ['GEMINI_API_KEY', 'GEMINI_AI_API_KEY', 'GEMINI_MODEL', 'CV_AI_PROVIDER', 'OTP_BYPASS_NUMBERS', 'OTP_BYPASS_OTP', 'OTP_BYPASS_IN_PRODUCTION']) {
  if (has(k)) add('info', 'cleanup', `${k} is set but no longer used - remove it`);
}

const icon = { ok: '  OK  ', warn: ' WARN ', missing: ' FAIL ', info: ' INFO ' };
const order = { missing: 0, warn: 1, info: 2, ok: 3 };
console.log(`\nEnsis backend env check (${fileArg ? `file ${fileArg}` : 'running environment'})\n`);
for (const r of results.sort((a, b) => order[a.level] - order[b.level] || a.area.localeCompare(b.area))) {
  console.log(`[${icon[r.level]}] ${r.area.padEnd(9)} ${r.msg}`);
}
const failed = results.filter((r) => r.level === 'missing').length;
const warned = results.filter((r) => r.level === 'warn').length;
console.log(`\n${failed} failing, ${warned} warnings. Values are never printed.`);
process.exit(failed ? 1 : 0);
