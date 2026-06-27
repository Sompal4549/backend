(async () => {
  try {
    const loginRes = await fetch('http://localhost:5000/api/v1/admin/login/dev', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9876543210' })
    });
    const loginJson = await loginRes.json();
    console.log('LOGIN STATUS', loginRes.status);
    console.log('LOGIN BODY', JSON.stringify(loginJson, null, 2));

    if (!loginJson.data?.accessToken) {
      console.error('No accessToken received');
      process.exit(1);
    }

    const token = loginJson.data.accessToken;
    const dashboardRes = await fetch('http://localhost:5000/api/v1/admin/dashboard', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
    const dashboardJson = await dashboardRes.json();
    console.log('DASHBOARD STATUS', dashboardRes.status);
    console.log('DASHBOARD BODY', JSON.stringify(dashboardJson, null, 2));
  } catch (e) {
    console.error('ERROR', e);
    process.exit(1);
  }
})();
