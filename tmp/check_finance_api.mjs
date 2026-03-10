import fetch from 'node-fetch';

async function testFinanceEndpoints() {
    console.log('Testing GET /api/finance-dashboard/projects...');
    try {
        const getRes = await fetch('http://localhost:3000/api/finance-dashboard/projects');
        if (!getRes.ok) throw new Error(`GET failed: ${getRes.status}`);
        const getData = await getRes.json();
        console.log('Aggregates:', getData.aggregates);
        console.log(`MOA Projects found: ${getData.projects?.length}`);

        if (getData.projects && getData.projects.length > 0) {
            const testProject = getData.projects[0];
            console.log(`\nTesting PATCH /api/finance-dashboard/projects/${testProject.project_id}/tranches...`);
            const patchRes = await fetch(`http://localhost:3000/api/finance-dashboard/projects/${testProject.project_id}/tranches`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tranche_1: 500000,
                    tranche_2: 300000,
                })
            });
            if (!patchRes.ok) throw new Error(`PATCH failed: ${patchRes.status}`);
            const patchData = await patchRes.json();
            console.log('PATCH success:', patchData);

            // Verification GET
            const verifyRes = await fetch('http://localhost:3000/api/finance-dashboard/projects');
            const verifyData = await verifyRes.json();
            console.log('\nVerification Aggregates:', verifyData.aggregates);
        } else {
            console.log('\nNo projects available to test PATCH.');
        }
    } catch (err) {
        console.error('Test failed:', err.message);
    }
}

testFinanceEndpoints();
