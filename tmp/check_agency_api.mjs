import fetch from 'node-fetch';

async function testAgencyEndpoints() {
    console.log('Testing GET /api/agency-dashboard/projects...');
    try {
        const getRes = await fetch('http://localhost:3000/api/agency-dashboard/projects');
        const rawText = await getRes.text();

        if (!getRes.ok) throw new Error(`GET failed: ${getRes.status} body: ${rawText}`);
        const getData = JSON.parse(rawText);

        console.log('Aggregates:', getData.aggregates);
        console.log(`Projects found: ${getData.projects?.length}`);

        if (getData.projects && getData.projects.length > 0) {
            console.log('Sample Project:', getData.projects[0]);
        } else {
            console.log('\nNo matching projects found. Global criteria may be filtering them out (needs MOA, implementing_agencies, tranche_1, moa, and rta).');
        }
    } catch (err) {
        console.error('Test failed:', err.message);
    }
}

testAgencyEndpoints();
