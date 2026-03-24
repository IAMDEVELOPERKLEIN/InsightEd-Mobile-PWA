import fetch from 'node-fetch';

async function testRegister() {
  const schoolData = {
    school_id: '114231',
    school_name: 'Test School (Abucay)',
    region: 'Region III',
    division: 'Bataan',
    province: 'Bataan',
    municipality: 'Abucay',
    latitude: 14.123456,
    longitude: 120.456789
  };

  try {
    const res = await fetch('http://localhost:3000/api/register-beta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test.head@deped.gov.ph',
        password: 'password123',
        contactNumber: '09123456789',
        firstName: 'Test',
        lastName: 'Head',
        schoolData: schoolData
      })
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch (e) {
    console.error("Fetch error:", e);
  }
}

testRegister();
