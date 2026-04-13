(async () => {
  try {
    const res = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Bob', email: 'bob@curl.com', password: 'password123', role: 'vendor', vendorSlug: 'bob-store-88' })
    });
    const data = await res.json();
    console.log("REGISTER STATUS:", res.status);
    console.log("REGISTER RESPONSE:");
    console.log(data);
  } catch (err) {
    console.error(err);
  }
})();
