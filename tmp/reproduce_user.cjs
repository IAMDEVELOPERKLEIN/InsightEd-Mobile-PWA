const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function callRegister() {
  const payload = {
    email: "reproduce_user_" + Date.now() + "@gmail.com",
    password: "password123",
    role: "Non-DepEd Engineer",
    firstName: "Reproduction",
    lastName: "User",
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
    console.log("Response Text Length:", text.length);
    console.log("Response Text:", text);
  } catch (err) {
    console.error("Fetch Error:", err.message);
  }
}

callRegister();
