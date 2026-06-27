(async ()=>{
  try{
    const res = await fetch('http://localhost:5000/api/v1/admin/login/dev', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9876543210' })
    });
    const text = await res.text();
    console.log('STATUS', res.status);
    console.log(text);
  }catch(e){
    console.error('ERROR', e);
    process.exit(1);
  }
})();
