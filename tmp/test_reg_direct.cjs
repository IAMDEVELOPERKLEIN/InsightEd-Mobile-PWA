const fetch = require('node-fetch');

async function testRegistration() {
  try {
    const res = await fetch('http://localhost:3000/api/register-beta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: "password123",
        contactNumber: "09999999999",
        firstName: "Test",
        lastName: "Head",
        schoolData: {
          school_id: "999988",
          school_name: "Test School " + Date.now(),
          curricularOffering: ""
        }
      })
    });
    
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Response:", data);
  } catch (err) {
    console.error("Error:", err);
  }
}

testRegistration();
