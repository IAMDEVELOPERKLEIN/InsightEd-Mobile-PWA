const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function callRegister() {
  const payload = {
    email: "test_special_" + Date.now() + "@deped.gov.ph",
    password: "password123",
    role: "Division Engineer",
    firstName: "Tést",
    lastName: "Èñgïnèêr",
    region: "Region XI",
    division: "Davao del Norte",
    position: "Engineer IV",
    contactNumber: "09123456789"
  };

  try {
    const res = await fetch('http://localhost:3000/api/register-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response Text:", text);
  } catch (err) {
    console.error("Fetch Error:", err.message);
  }
}

callRegister();
