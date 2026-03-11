const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function update() {
  try {
    const engineerUid = 'V4kvTSEaaxP1F4kcW3g8Hsc3f0l1';
    const projectId = 398;
    
    // Check if it exists first
    const check = await pool.query("SELECT * FROM engineer_form WHERE project_id = $1", [projectId]);
    console.log(`Project ${projectId} exists: ${check.rows.length > 0}`);
    
    if (check.rows.length > 0) {
      const res = await pool.query(
        "UPDATE engineer_form SET engineer_id = $1, engineer_name = 'DepEd Engineer' WHERE project_id = $2",
        [engineerUid, projectId]
      );
      console.log(`Updated ${res.rowCount} rows.`);
      
      const after = await pool.query("SELECT * FROM engineer_form WHERE project_id = $1", [projectId]);
      console.log("After update:", after.rows[0]);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

update();
