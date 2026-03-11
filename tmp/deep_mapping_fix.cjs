const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  try {
    const engineerUid = 'V4kvTSEaaxP1F4kcW3g8Hsc3f0l1';
    
    // 1. Find all projects with the name 'DepEd Engineer' that don't have our UID
    const res = await pool.query(
      "SELECT project_id, engineer_id, engineer_name FROM engineer_form WHERE engineer_name ILIKE '%DepEd Engineer%' AND (engineer_id IS DISTINCT FROM $1)",
      [engineerUid]
    );
    console.log(`Found ${res.rows.length} projects to fix.`);
    console.table(res.rows);

    if (res.rows.length > 0) {
      const ids = res.rows.map(r => r.project_id);
      const updateRes = await pool.query(
        "UPDATE engineer_form SET engineer_id = $1, engineer_name = 'DepEd Engineer' WHERE project_id = ANY($2)",
        [engineerUid, ids]
      );
      console.log(`Successfully updated ${updateRes.rowCount} projects.`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

fix();
