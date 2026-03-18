
async function testLogin(schoolId, password) {
    try {
        console.log(`Testing login for School ID: ${schoolId}`);
        const response = await fetch('http://localhost:3000/api/auth/migrate-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ school_id: schoolId, password: password })
        });
        const data = await response.json();
        console.log('Response Status:', response.status);
        console.log('Response Body:', data);
    } catch (error) {
        console.log('Fetch Error:', error.message);
    }
}

async function testMasterLogin(schoolId, masterPassword) {
    try {
        console.log(`Testing master login for School ID: ${schoolId}`);
        const response = await fetch('http://localhost:3000/api/auth/master-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ school_id: schoolId, masterPassword: masterPassword })
        });
        const data = await response.json();
        console.log('Response Status:', response.status);
        console.log('Response Body:', data);
    } catch (error) {
        console.log('Fetch Error:', error.message);
    }
}

(async () => {
    // Test Case 1: Wrong Password
    await testLogin('111841', 'wrong_password');
    
    // Test Case 2: Master Login (Check if 500 can be avoided or if logs are better)
    // We expect a 403 or 404 if the master password is wrong or user is not found, 
    // but NOT a 500 with an empty body.
    await testMasterLogin('111841', 'wrong_master');
})();
