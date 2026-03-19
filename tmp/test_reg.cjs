
// Use native fetch (Node 18+)

async function testReg() {
  const payload = {
    schoolData: {
      school_id: "test_" + Date.now(),
      school_name: "Test School",
      region: "Region I"
    },
    password: "password123",
    contactNumber: "09123456789",
    firstName: "Test",
    lastName: "User",
    passcode: "123456"
  };

  try {
    console.log("Sending registration request...");
    const res = await fetch("http://localhost:3000/api/register-beta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log("Response Status:", res.status);
    console.log("Response Body:", data);
  } catch (err) {
    console.error("Fetch Error:", err.message);
  }
}

testReg();
