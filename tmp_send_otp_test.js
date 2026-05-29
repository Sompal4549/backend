(async ()=>{
  try{
    const res = await fetch('http://localhost:5000/api/v1/auth/email-otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ecommerce.com', purpose: 'login', message: 'Hello ADMIN, your code is: {{code}}' })
    });
    const text = await res.text();
    console.log('STATUS', res.status);
    console.log(text);
  }catch(e){
    console.error('ERROR', e);
    process.exit(1);
  }
})();
