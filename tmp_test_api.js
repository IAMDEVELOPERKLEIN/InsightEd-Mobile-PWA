import fetch from 'node-fetch';

async function testEndpoints() {
    const baseUrl = 'http://localhost:3000'; // Assuming the server runs on 3000
    
    // Test location-options
    try {
        console.log('Testing /api/sdo/location-options...');
        const res = await fetch(`${baseUrl}/api/sdo/location-options?region=Region%20V&division=Albay`);
        if (res.ok) {
            const data = await res.json();
            console.log('Success! Data count:', data.length);
            if (data.length > 0) {
                console.log('Sample row:', data[0]);
            }
        } else {
            console.error('Failed to fetch location options:', res.status, await res.text());
        }
    } catch (err) {
        console.error('Error testing location-options:', err.message);
    }

    // Test master-list/school/:id
    try {
        console.log('\nTesting /api/master-list/school/1234567...');
        const res = await fetch(`${baseUrl}/api/master-list/school/1234567`);
        if (res.ok) {
            const data = await res.json();
            console.log('Success! School data found:', data.school_name);
            console.log('Check aliasing (school_id):', data.school_id);
            console.log('Check aliasing (address):', data.address);
        } else {
            console.error('Failed to fetch school profile:', res.status, await res.text());
        }
    } catch (err) {
        console.error('Error testing school profile:', err.message);
    }
}

testEndpoints();
