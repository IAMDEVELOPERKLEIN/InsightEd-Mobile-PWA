import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api';

async function testFinanceAPI() {
    console.log('🚀 Testing Finance Dashboard API...');

    try {
        // 1. Test GET /api/finance-dashboard/projects
        console.log('\n--- Testing GET /api/finance-dashboard/projects ---');
        const res = await fetch(`${API_BASE}/finance-dashboard/projects`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        const data = await res.json();
        console.log('Aggregates:', JSON.stringify(data.aggregates, null, 2));
        console.log('Number of projects returned:', data.projects.length);

        if (data.projects.length > 0) {
            const testProject = data.projects[0];
            console.log('\n--- Testing Project Detail ---');
            console.log(`ID: ${testProject.project_id}, Name: ${testProject.project_name}`);
            console.log(`Tranche 1: ${testProject.tranche_1}, Tranche 2: ${testProject.tranche_2}, Tranche 3: ${testProject.tranche_3}`);
            console.log(`MOA PDF: ${testProject.moa_pdf}, RTA PDF: ${testProject.rta_pdf}`);

            // 2. Test PATCH /api/finance-dashboard/projects/:id/tranches
            console.log(`\n--- Testing PATCH /api/finance-dashboard/projects/${testProject.project_id}/tranches ---`);
            const originalT1 = parseFloat(testProject.tranche_1 || 0);
            const newT1 = originalT1 + 1000;

            const patchRes = await fetch(`${API_BASE}/finance-dashboard/projects/${testProject.project_id}/tranches`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tranche_1: newT1 })
            });

            if (!patchRes.ok) throw new Error(`PATCH failed! status: ${patchRes.status}`);
            const patchData = await patchRes.json();
            console.log('Patch result:', JSON.stringify(patchData.project, null, 2));

            // 3. Verify Aggregate Update
            console.log('\n--- Verifying Aggregate Update ---');
            const verifyRes = await fetch(`${API_BASE}/finance-dashboard/projects`);
            const verifyData = await verifyRes.json();
            console.log('New Aggregates:', JSON.stringify(verifyData.aggregates, null, 2));

            const expectedT1 = data.aggregates.totalTranche1 + 1000;
            if (verifyData.aggregates.totalTranche1 === expectedT1) {
                console.log('✅ Success: Total Tranche 1 aggregate updated correctly!');
            } else {
                console.error(`❌ Error: Total Tranche 1 aggregate mismatch. Expected ${expectedT1}, got ${verifyData.aggregates.totalTranche1}`);
            }

            // Cleanup: Revert change
            console.log('\n--- Cleaning up: Reverting Tranche 1 ---');
            await fetch(`${API_BASE}/finance-dashboard/projects/${testProject.project_id}/tranches`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tranche_1: originalT1 })
            });

        } else {
            console.log('No projects found with MOA and RTA files. Please ensure some exist in the DB for a full test.');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testFinanceAPI();
