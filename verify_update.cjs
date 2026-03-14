const pg = require('pg');
const pool = new pg.Pool({ 
  connectionString: 'postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd',
  ssl: { rejectUnauthorized: false }
});

async function testUpdate() {
  try {
    const res = await pool.query("SELECT project_id, status_of_construction_phase FROM engineer_form LIMIT 1");
    if (res.rows.length === 0) {
        console.log("No projects found to test.");
        return;
    }
    const project = res.rows[0];
    const id = project.project_id;
    console.log(`Original Status of project ${id}: ${project.status_of_construction_phase}`);

    const updateData = {
      status: 'Ongoing',
      uid: 'yC9m8hrZIMRHpUfwUs6M2W8q3S52', 
      modifiedBy: 'Verification Script'
    };

    console.log(`Sending update: status = 'Ongoing'`);
    
    // Using axios or plain http request since fetch might need experimental flag in older node, 
    // but 24.x should have it. I'll use axios if it's in package.json, else http.
    // I'll check package.json. No axios.
    // I'll use the built-in fetch.
    
    const response = await fetch(`http://localhost:3000/api/update-project/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    if (response.ok) {
      console.log('Update API returned success');
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
