const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const engineerUid = 'V4kvTSEaaxP1F4kcW3g8Hsc3f0l1';
    
    // 1. Get unique names and ids that are NOT OURS
    const res = await pool.query(
      "SELECT DISTINCT engineer_id, engineer_name, length(engineer_id) as id_len, length(engineer_name) as name_len FROM engineer_form WHERE engineer_id IS DISTINCT FROM $1",
      [engineerUid]
    );
    console.log("Mismatched / Other Engineer IDs and Names:");
    console.table(res.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
