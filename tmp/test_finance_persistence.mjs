
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: "postgres://postgres:S9lUpxYIeD08@20.44.209.117:5432/postgres?sslmode=require"
});

async function testPersistence() {
  console.log("🚀 Testing Finance Data Persistence...");
  
  try {
    // 1. Pick a dummy project or create one
    const testIpc = 'TEST-VERIFY-' + Date.now();
    await pool.query(`
      INSERT INTO engineer_form (project_name, school_name, school_id, ipc, engineer_id, mode_of_project)
      VALUES ('Test Project', 'Test School', '123456', $1, 'auth0|123', 'MOA')
    `, [testIpc]);
    
    const res = await pool.query('SELECT project_id FROM engineer_form WHERE ipc = $1 ORDER BY project_id DESC LIMIT 1', [testIpc]);
    const projectId = res.rows[0].project_id;
    console.log(`✅ Created test project ${projectId} with IPC ${testIpc}`);
    
    // 2. Add MOA/RTA and Tranches (Simulate initial state)
    await pool.query(`
      UPDATE engineer_form 
      SET moa_pdf = 'test_moa', rta_pdf = 'test_rta', tranche_1 = 1000, tranche_2 = 2000, tranche_3 = 3000
      WHERE project_id = $1
    `, [projectId]);
    console.log("✅ Set MOA/RTA and Tranches");
    
    // 3. Simulate Status Update via API (using fetch to localhost)
    // We need the API to be running.
    console.log("👉 Simulating Status Update via API...");
    const updateResponse = await fetch(`http://localhost:5000/api/update-project/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        statusOfConstructionPhase: 'Under Construction',
        update_type: 'Regular Update',
        uid: 'dummy_uid'
      })
    });
    
    const updateResult = await updateResponse.json();
    if (!updateResponse.ok) {
      throw new Error(`API Update failed: ${updateResult.message || updateResult.error}`);
    }
    
    const newProjectId = updateResult.newData ? updateResult.newData.project_id : (await pool.query('SELECT project_id FROM engineer_form WHERE ipc = $1 ORDER BY project_id DESC LIMIT 1', [testIpc])).rows[0].project_id;
    console.log(`✅ Status update successful. New Project ID in history: ${newProjectId}`);
    
    // 4. Verify data in new row
    const verifyRes = await pool.query('SELECT * FROM engineer_form WHERE project_id = $1', [newProjectId]);
    const latestRow = verifyRes.rows[0];
    
    const missing = [];
    if (latestRow.moa_pdf !== 'test_moa') missing.push('moa_pdf');
    if (latestRow.rta_pdf !== 'test_rta') missing.push('rta_pdf');
    if (parseFloat(latestRow.tranche_1) !== 1000) missing.push('tranche_1');
    if (parseFloat(latestRow.tranche_2) !== 2000) missing.push('tranche_2');
    if (parseFloat(latestRow.tranche_3) !== 3000) missing.push('tranche_3');
    
    if (missing.length > 0) {
      console.error(`❌ Data NOT preserved in history append: ${missing.join(', ')}`);
      // console.log("Row details:", latestRow);
    } else {
      console.log("✅ ALL finance data preserved in history append!");
    }
    
    // 5. Check Finance Dashboard API
    const financeRes = await fetch('http://localhost:5000/api/finance-dashboard/projects');
    const financeData = await financeRes.json();
    if (!financeRes.ok) {
        console.error("❌ Finance Dashboard API Error:", financeData.error);
    } else {
        console.log("✅ Finance Dashboard API success!");
        const testProject = financeData.projects.find(p => p.project_id === newProjectId);
        if (testProject) {
            console.log("✅ Test project found in Finance Dashboard results!");
        } else {
            console.error("❌ Test project NOT found in Finance Dashboard results!");
        }
    }
    
    // Cleanup
    await pool.query('DELETE FROM engineer_form WHERE ipc = $1', [testIpc]);
    console.log("✅ Cleaned up test data");

  } catch (err) {
    console.error("❌ Test failed:", err.message);
  } finally {
    await pool.end();
  }
}

testPersistence();
