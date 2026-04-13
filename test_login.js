(async () => {
  try {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@curl.com', password: 'password123' })
    });
    const data = await res.json();
    console.log("LOGIN RESPONSE:");
    console.log(data);

    if (data.accessToken) {
      const meRes = await fetch('http://localhost:5000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${data.accessToken}`
        }
      });
      console.log("ME STATUS:", meRes.status);
      const meData = await meRes.json();
      console.log("ME DATA:", meData);
    }
  } catch (err) {
    console.error(err);
  }
})();
