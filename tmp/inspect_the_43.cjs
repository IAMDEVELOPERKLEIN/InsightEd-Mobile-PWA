const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function find() {
  try {
    const engineerUid = 'V4kvTSEaaxP1F4kcW3g8Hsc3f0l1';
    
    // Select projects that are NOT linked to our engineer
    const res = await pool.query(
      "SELECT project_id, engineer_id, engineer_name FROM engineer_form WHERE engineer_id IS DISTINCT FROM $1 LIMIT 50",
      [engineerUid]
    );
    console.log(`Found ${res.rows.length} projects not linked to ${engineerUid}`);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

find();
