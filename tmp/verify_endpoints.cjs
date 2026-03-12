const https = require('https');
const http = require('http');

async function testEndpoint(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
        }).on('error', reject);
    });
}

async function verify() {
    const engineerUid = 'V4kvTSEaaxP1F4kcW3g8Hsc3f0l1';
    const baseUrl = 'http://localhost:3000/api'; // Assuming server runs on 3000

    console.log('--- Verifying Engineer Profile ---');
    try {
        const profile = await testEndpoint(`${baseUrl}/users/${engineerUid}`);
        console.log('Status:', profile.status);
        console.log('Profile Data (Summary):', {
            uid: profile.data.uid,
            firstName: profile.data.firstName,
            lastName: profile.data.lastName,
            role: profile.data.role
        });
    } catch (e) {
        console.error('Profile test failed:', e.message);
    }

    console.log('\n--- Verifying Engineer Projects (Home Tab Data) ---');
    try {
        // The home tab fetches projects to compute counts
        const projects = await testEndpoint(`${baseUrl}/projects?engineer_id=${engineerUid}`);
        console.log('Status:', projects.status);
        console.log('Project Count:', Array.isArray(projects.data) ? projects.data.length : 'Not an array');
        if (Array.isArray(projects.data) && projects.data.length > 0) {
            const first = projects.data[0];
            console.log('Sample Project:', {
                project_id: first.project_id,
                abc: first.abc,
                contract_amount: first.contract_amount
            });
        }
    } catch (e) {
        console.error('Projects test failed:', e.message);
    }
}

verify();
