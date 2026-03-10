// test_register.js
import fetch from 'node-fetch'; // Requires "type": "module" in package.json or using node v18+ natively
// Using standard fetch available in Node.js 18+

async function testRegister() {
  const uniqueId = Date.now().toString().substring(5); // unique 8 digit ID
  const url = 'http://localhost:3000/api/register-school'; // Adjust port if necessary
  const payload = {
    email: `test_school_${uniqueId}@deped.gov.ph`,
    password: 'SecurePassword123!',
    contactNumber: '09123456789',
    schoolData: {
        school_id: `99${uniqueId}`,
        school_name: `Test School ${uniqueId}`,
        region: 'NCR',
        division: 'Manila',
        district: 'Manila',
        municipality: 'Manila',
        curricularOffering: 'Elementary',
        lat: 14.5,
        lng: 121.0
    }
  };

  try {
    console.log("Sending logic to", url);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("Response Status:", response.status);
    console.log("Response Data:", data);

    if (data.success && data.customToken) {
      console.log("\\n✅ NATIVE AUTH SUCCESS!");
      console.log("A Firebase Custom Token was successfully generated block:");
      console.log(data.customToken.substring(0, 50) + "...");
    } else {
      console.log("\\n❌ NATIVE AUTH FAILED.");
    }

  } catch (error) {
    console.error("Test Request Error:", error);
  }
}

testRegister();
