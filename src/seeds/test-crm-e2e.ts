import http from 'http';

function checkHttp(url: string, headers: Record<string, string> = {}): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: 'GET',
        headers: {
          Cookie: 'ensis_session=6ad09d89fe393cdf88e4d778',
          Accept: 'text/html,application/json,*/*',
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode || 0, text: data }));
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function postHttp(url: string, payload: any): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = JSON.stringify(payload);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          Cookie: 'ensis_session=6ad09d89fe393cdf88e4d778',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 0, json: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode || 0, json: data });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run() {
  console.log('========================================================================');
  console.log('STARTING ENSIS CRM COMPREHENSIVE END-TO-END VERIFICATION');
  console.log('========================================================================\n');

  // 1. Check all UI pages on http://localhost:3010
  const pages = [
    '/dashboard',
    '/my-work',
    '/my-work/daily-report',
    '/account',
    '/sales/leads',
    '/sales/leads/pipeline',
    '/sales/leads/import-history',
    '/sales/clients',
    '/sales/marketing',
    '/sales/marketing/campaigns/new',
    '/sales/marketing/templates/editor',
    '/sales/quotations',
    '/sales/quotations/new',
    '/sales/quotations/QT-0124',
    '/sales/quotations/QT-0124/revise',
    '/sales/orders/SO-2026-0090',
    '/operations/projects',
    '/operations/projects/new',
    '/operations/projects/PJ-2026-0018',
    '/operations/projects/PJ-2026-0018/edit',
    '/operations/projects/PJ-2026-0018/handover',
    '/operations/production',
    '/operations/production/jobs/new',
    '/operations/production/jobs/JB-2026-0086',
    '/operations/production/jobs/JB-2026-0086/qc',
    '/operations/production/dispatch/new',
    '/operations/purchase',
    '/operations/purchase/requests/new',
    '/operations/purchase/orders/new',
    '/operations/purchase/receipts/new',
    '/operations/inventory',
    '/management/accounts',
    '/management/accounts/invoices/new',
    '/management/accounts/statement',
    '/management/team',
    '/management/team/attendance',
    '/management/service',
    '/management/reports',
    '/management/reports/users',
    '/management/reports/users/roles',
    '/management/reports/workflow',
    '/management/reports/workflow/notifications',
    '/management/reports/workflow/integrations',
    '/management/reports/master-data',
    '/management/reports/master-data/catalogue',
    '/management/reports/master-data/units',
    '/management/reports/activity',
    '/management/reports/view/monthly-sales-summary',
  ];

  console.log(`--- Checking ${pages.length} CRM UI Pages on Port 3010 ---`);
  let pageSuccess = 0;
  let pageFail = 0;

  for (const page of pages) {
    try {
      const res = await checkHttp(`http://localhost:3010${page}`);
      const isOk = res.status === 200 && !res.text.includes('Application error:') && !res.text.includes('Cannot read properties of undefined');
      if (isOk) {
        pageSuccess++;
        console.log(`[PASS] Page 200 OK: ${page}`);
      } else {
        pageFail++;
        console.log(`[FAIL] Page Error: ${page} -> Status ${res.status}`);
      }
    } catch (e: any) {
      pageFail++;
      console.log(`[FAIL] Network exception: ${page} -> ${e.message}`);
    }
  }

  // 2. Check CRM Backend API Endpoints on Port 5000
  console.log(`\n--- Checking CRM Backend Endpoints on Port 5000 ---`);
  const apiGetEndpoints = [
    '/me',
    '/lookups',
    '/leads/overview',
    '/leads/imports',
    '/opportunities/pipeline',
    '/clients/overview',
    '/dashboard/company',
    '/quotations/overview',
    '/projects/overview',
    '/work/overview',
    '/daily-reports/today',
    '/search?q=Aarav',
    '/follow-ups',
    '/notifications',
    '/export/leads',
    '/export/clients',
    '/export/users',
    '/export/purchase',
    '/export/quotations',
    '/export/pipeline',
  ];

  let apiSuccess = 0;
  let apiFail = 0;

  for (const ep of apiGetEndpoints) {
    try {
      const res = await checkHttp(`http://127.0.0.1:5000/api/v1/crm${ep}`);
      const isOk = res.status === 200;
      if (isOk) {
        apiSuccess++;
        console.log(`[PASS] API 200 OK: GET /api/v1/crm${ep}`);
      } else {
        apiFail++;
        console.log(`[FAIL] API Error: GET /api/v1/crm${ep} -> Status ${res.status}`);
      }
    } catch (e: any) {
      apiFail++;
      console.log(`[FAIL] Network error on API: GET ${ep} -> ${e.message}`);
    }
  }

  // 3. Test Form Submissions
  console.log(`\n--- Checking Modal & Workflow Form POST Endpoints ---`);
  const formTests = [
    { url: '/forms/assignTask', body: { title: 'Test Task 1', department: 'Production' } },
    { url: '/forms/dailyReport', body: { summary: 'Completed daily report test' } },
    { url: '/workflows/expense', body: { category: 'Travel', amount: 1500 } },
    { url: '/workflows/stockAdjustment', body: { item: 'Brass Fitting', qty: 10 } },
    { url: '/leads', body: { fullName: 'E2E Test User', mobile: '+91 9999911111', interest: 'Equipment' } },
    { url: '/clients', body: { name: 'E2E Test Client', clientType: 'Clinic', city: 'Jaipur' } },
  ];

  let formSuccess = 0;
  let formFail = 0;

  for (const ft of formTests) {
    try {
      const res = await postHttp(`http://127.0.0.1:5000/api/v1/crm${ft.url}`, ft.body);
      const isOk = res.status === 200 || res.status === 201;
      if (isOk) {
        formSuccess++;
        console.log(`[PASS] Form 201 Created: POST ${ft.url}`);
      } else {
        formFail++;
        console.log(`[FAIL] Form Error: POST ${ft.url} -> Status ${res.status}`);
      }
    } catch (e: any) {
      formFail++;
      console.log(`[FAIL] Exception: POST ${ft.url} -> ${e.message}`);
    }
  }

  console.log('\n========================================================================');
  console.log('SUMMARY RESULTS:');
  console.log(`UI Pages Tested: ${pages.length} | Passed: ${pageSuccess} | Failed: ${pageFail}`);
  console.log(`API Endpoints Tested: ${apiGetEndpoints.length} | Passed: ${apiSuccess} | Failed: ${apiFail}`);
  console.log(`Form Submissions Tested: ${formTests.length} | Passed: ${formSuccess} | Failed: ${formFail}`);
  console.log('========================================================================');
}

run().catch(console.error);
