async function testForgotPasswordFix() {
    const url = 'http://localhost:3000/api/forgot-password';
    const body = { schoolId: '113508' };

    console.log(`🚀 Testing Forgot Password Fix for 113508 (null email)...`);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        console.log(`Status: ${res.status}`);
        console.log("Response:", JSON.stringify(data, null, 2));
        
        if (res.status === 404 && data.error && data.error.includes("No email address registered")) {
            console.log("✅ SUCCESS: Backend handled null email gracefully.");
        } else {
            console.log("❌ FAILURE: Unexpected response.");
        }
    } catch (err) {
        console.error("❌ Request Failed:", err.message);
    }
}

testForgotPasswordFix();
