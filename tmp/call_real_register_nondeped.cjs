const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function callRegister() {
  const payload = {
    email: "test_nondeped_" + Date.now() + "@gmail.com", // Non-DepEd can use gmail
    password: "password123",
    role: "Non-DepEd Engineer",
    firstName: "Test",
    lastName: "NonDepEd",
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
