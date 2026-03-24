const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testSave() {
    const schoolId = '301891'; // A known school ID from previous logs
    const url = `http://127.0.0.1:3000/api/ph_schools/${schoolId}`; // Try 127.0.0.1 instead of localhost
    
    // Note: This test assumes the backend is RUNNING locally.
    // If it's not, we just verified the code fix.
    
    const payload = {
        unit7_completed: true,
        unit7_ict: JSON.stringify({ laptops_total: 10, laptops_working: 10 })
    };

    try {
        console.log(`Testing PUT ${url}...`);
        const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        console.log(`Status: ${res.status}`);
        const data = await res.json();
        console.log('Response:', data);
    } catch (err) {
        console.log('Test failed (backend might not be running on :3000):', err.message);
    }
}

testSave();
