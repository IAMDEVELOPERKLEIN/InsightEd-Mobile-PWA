const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function link() {
  try {
    const engineerUid = 'V4kvTSEaaxP1F4kcW3g8Hsc3f0l1';
    
    // Update all projects where name is 'DepEd Engineer' OR id is NULL/empty
    const updateRes = await pool.query(
      "UPDATE engineer_form SET engineer_id = $1 WHERE engineer_name = 'DepEd Engineer' OR engineer_id IS NULL OR engineer_id = ''",
      [engineerUid]
    );
    console.log(`Successfully linked ${updateRes.rowCount} projects to DepEd Engineer.`);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

link();
