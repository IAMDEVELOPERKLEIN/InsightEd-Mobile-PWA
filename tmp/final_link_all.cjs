const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function linkAll() {
  try {
    const engineerUid = 'V4kvTSEaaxP1F4kcW3g8Hsc3f0l1';
    
    // Update all projects where engineer_id is NULL or empty
    const updateRes = await pool.query(
      "UPDATE engineer_form SET engineer_id = $1, engineer_name = 'DepEd Engineer' WHERE engineer_id IS NULL OR engineer_id = ''",
      [engineerUid]
    );
    console.log(`Successfully linked ${updateRes.rowCount} projects to DepEd Engineer (${engineerUid}).`);

  } catch (err) {
    console.error("Link All Error:", err);
  } finally {
    await pool.end();
  }
}

linkAll();
