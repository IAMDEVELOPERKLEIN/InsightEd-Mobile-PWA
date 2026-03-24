const pg = require('pg');
const pool = new pg.Pool({ 
  connectionString: 'postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd',
  ssl: { rejectUnauthorized: false }
});

async function testUpdate() {
  try {
    // 1. Get a project
    const res = await pool.query("SELECT project_id, status_of_construction_phase FROM engineer_form LIMIT 1");
    const project = res.rows[0];
    const id = project.project_id;
    console.log(`Original Status of project ${id}: ${project.status_of_construction_phase}`);

    // 2. Simulate Frontend Update (sending 'status' instead of 'statusOfConstructionPhase')
    const updateData = {
      status: 'Ongoing',
      uid: 'yC9m8hrZIMRHpUfwUs6M2W8q3S52', // From our user list
      modifiedBy: 'Verification Script'
    };

    console.log(`Sending update: status = 'Ongoing'`);
    
    const response = await fetch(`http://localhost:3000/api/update-project/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Update API returned success');
      
      // 3. Verify in DB
      const verifyRes = await pool.query("SELECT status_of_construction_phase FROM engineer_form WHERE project_id = $1 ORDER BY project_id DESC LIMIT 1", [id]);
      // Wait, the update endpoint APPENDS a new row. So we need the latest one.
      // But wait, the update-project endpoint uses the passed ID to find old data, then appends.
      // So checking the latest row for this "project" (linked by IPC) is better.
      
      const ipcRes = await pool.query("SELECT ipc FROM engineer_form WHERE project_id = $1", [id]);
      const ipc = ipcRes.rows[0].ipc;
      
      const lastRes = await pool.query("SELECT status_of_construction_phase, actions FROM engineer_form WHERE ipc = $1 ORDER BY project_id DESC LIMIT 1", [ipc]);
      console.log(`Verified Status in DB: ${lastRes.rows[0].status_of_construction_phase}`);
      console.log(`Action: ${lastRes.rows[0].actions}`);
    } else {
      console.error('Update API failed:', await response.text());
    }

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

testUpdate();
