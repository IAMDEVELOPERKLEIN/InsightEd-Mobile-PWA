import fetch from 'node-fetch';

async function testCheck() {
  try {
    const res = await fetch('http://localhost:3000/api/check-existing-school', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId: '114231' })
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch (e) {
    console.error("Fetch error:", e);
  }
}

testCheck();
