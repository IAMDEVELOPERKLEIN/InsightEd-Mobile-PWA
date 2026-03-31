import fetch from 'node-fetch';

async function testEndpoints() {
    const baseUrl = 'http://localhost:3000'; // Assuming the server runs on 3000
    
    // Test location-options with MIMAROPA / Palawan
    try {
        console.log('Testing /api/sdo/location-options (MIMAROPA / Palawan)...');
        const res = await fetch(`${baseUrl}/api/sdo/location-options?region=MIMAROPA&division=Palawan`);
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
}

testEndpoints();
