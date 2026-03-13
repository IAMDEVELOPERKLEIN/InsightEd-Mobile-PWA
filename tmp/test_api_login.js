
import fetch from 'node-fetch';

async function testLogin() {
  const ports = [3000, 3001, 5000];
  for (const port of ports) {
    try {
      console.log(`>>> Testing port ${port}...`);
      const res = await fetch(`http://localhost:${port}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: '112461',
          password: 'sebtest'
        })
      });
      const text = await res.text();
      console.log(`Status: ${res.status}`);
      console.log(`Body: ${text}`);
      if (res.ok || res.status === 401 || res.status === 500) {
          console.log(`✅ Found active API on port ${port}`);
          break;
      }
    } catch (err) {
      console.log(`❌ Port ${port} failed: ${err.message}`);
    }
  }
}

testLogin();
