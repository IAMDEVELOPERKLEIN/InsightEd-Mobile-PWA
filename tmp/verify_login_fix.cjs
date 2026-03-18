
const axios = require('axios');

async function testLogin(schoolId, password) {
    try {
        console.log(`Testing login for School ID: ${schoolId}`);
        const response = await axios.post('http://localhost:3000/api/auth/migrate-login', {
            school_id: schoolId,
            password: password
        });
        console.log('Response Status:', response.status);
        console.log('Response Body:', response.data);
    } catch (error) {
        console.log('Error Status:', error.response ? error.response.status : 'No response');
        console.log('Error Body:', error.response ? error.response.data : error.message);
    }
}

async function testMasterLogin(schoolId, masterPassword) {
    try {
        console.log(`Testing master login for School ID: ${schoolId}`);
        const response = await axios.post('http://localhost:3000/api/auth/master-login', {
            school_id: schoolId,
            masterPassword: masterPassword
        });
        console.log('Response Status:', response.status);
        console.log('Response Body:', response.data);
    } catch (error) {
        console.log('Error Status:', error.response ? error.response.status : 'No response');
        console.log('Error Body:', error.response ? error.response.data : error.message);
    }
}

// Run tests
(async () => {
    // Test Case 1: Wrong Password (should show real error message from backend now)
    await testLogin('111841', 'wrong_password');
    
    // Test Case 2: Master Login (should work even if activity_logs fails)
    // Note: This requires ADMIN_MASTER_PASSWORD from .env
    // We can't easily check the .env here without reading it, but we can try common ones or just see if it doesn't 500
    // await testMasterLogin('111841', 'some_password'); 
})();
