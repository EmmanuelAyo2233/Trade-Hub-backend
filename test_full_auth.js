import fetch from 'node-fetch'; // or we can use global fetch if Node 18+

const test = async () => {
  try {
    const email = `test_${Date.now()}@gmail.com`;
    const password = 'password123';

    console.log('Registering user:', email);
    const regRes = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Vendor',
        email,
        password,
        role: 'vendor',
        vendorSlug: `slug-${Date.now()}`,
        vendorDescription: 'Test store'
      })
    });

    console.log('Register Status:', regRes.status);
    const regData = await regRes.json();
    console.log('Register Data:', regData);

    if (regRes.status !== 201) {
      console.log('Registration failed. Trying to log in with existing user instead...');
    }

    console.log('Logging in...');
    const logRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    console.log('Login Status:', logRes.status);
    const logData = await logRes.json();
    console.log('Login Data:', logData);

    if (logData.accessToken) {
      console.log('Fetching profile...');
      const meRes = await fetch('http://localhost:5000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${logData.accessToken}`
        }
      });
      console.log('Me Status:', meRes.status);
      const meData = await meRes.json();
      console.log('Me Data:', meData);
    }
  } catch (err) {
    console.error('Error during auth test:', err);
  }
};

test();
