const http = require('http');

const failed = [
  '/sales/orders/SO-2026-0090',
  '/operations/projects',
  '/operations/projects/PJ-2026-0018',
  '/operations/production/jobs/JB-2026-0086',
  '/operations/production/jobs/JB-2026-0086/qc',
  '/operations/production/dispatch/new',
  '/operations/purchase/orders/new',
  '/operations/purchase/receipts/new',
  '/management/accounts'
];

async function check() {
  for (const p of failed) {
    await new Promise(r => {
      http.get('http://localhost:3010' + p, { headers: { Cookie: 'ensis_session=6ad09d89fe393cdf88e4d778' } }, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          console.log('\n==============================');
          console.log('PAGE:', p, 'STATUS:', res.statusCode);
          const idx = d.indexOf('Cannot read properties of undefined');
          if (idx !== -1) {
            console.log('Found TypeError:', d.substring(idx - 50, idx + 250));
          } else {
            const appErr = d.indexOf('Application error:');
            if (appErr !== -1) {
              console.log('Found App Error:', d.substring(appErr - 50, appErr + 250));
            } else {
              console.log('HTML snippet:', d.substring(0, 400));
            }
          }
          r();
        });
      });
    });
  }
}
check();
