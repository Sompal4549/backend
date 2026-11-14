const crypto = require('crypto');
require('dotenv').config();

let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
privateKey = privateKey.trim();
if (privateKey.startsWith('"')) privateKey = privateKey.slice(1);
if (privateKey.endsWith('\\')) privateKey = privateKey.slice(0, -1);
if (privateKey.endsWith('"')) privateKey = privateKey.slice(0, -1);
privateKey = privateKey.trim().replace(/\\n/g, '\n');

const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function getToken(scope) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: email,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const data = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(data);
  const signature = sign.sign(privateKey);
  const assertion = `${data}.${base64url(signature)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const json = await res.json();
  return json.access_token;
}

async function run() {
  const gscToken = await getToken('https://www.googleapis.com/auth/webmasters.readonly');
  
  for (const site of ['sc-domain:ensis.in', 'https://ensis.in/', 'https://ensis.in', 'https://www.ensis.in/']) {
    const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${gscToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: '2025-01-01', endDate: '2025-01-28', rowLimit: 1 }),
    });
    console.log(`GSC query ${site} -> status:`, res.status);
    if (res.status === 200) {
      console.log('SUCCESS! Data:', await res.text());
    }
  }

  // Also check Bharat Organic site just in case the service account had bharatorganicexpo.com
  for (const site of ['sc-domain:bharatorganicexpo.com', 'https://bharatorganicexpo.com/']) {
    const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${gscToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: '2025-01-01', endDate: '2025-01-28', rowLimit: 1 }),
    });
    console.log(`GSC query ${site} -> status:`, res.status);
    if (res.status === 200) {
      console.log('SUCCESS! Data:', await res.text());
    }
  }
}

run().catch(console.error);
