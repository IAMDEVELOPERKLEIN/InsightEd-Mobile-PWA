async function testLogin() {
    const url = 'http://localhost:3000/api/auth/pin-login';
    const body = {
        school_id: '113508',
        pin: '111111'
    };

    console.log(`🚀 Testing PIN Login for 113508...`);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        console.log(`Status: ${res.status}`);
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("❌ Request Failed:", err.message);
    }
}

testLogin();
