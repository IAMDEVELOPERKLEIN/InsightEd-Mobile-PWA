const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function link() {
  try {
    const engineerUid = 'V4kvTSEaaxP1F4kcW3g8Hsc3f0l1';
    
    // 1. Identify rows to update
    const toUpdate = await pool.query(
      "SELECT project_id, engineer_id, engineer_name FROM engineer_form WHERE engineer_name ILIKE '%DepEd Engineer%'"
    );
    console.log(`Found ${toUpdate.rows.length} rows to update.`);
    
    // 2. Perform Update
    const res = await pool.query(
      "UPDATE engineer_form SET engineer_id = $1, engineer_name = 'DepEd Engineer' WHERE engineer_name ILIKE '%DepEd Engineer%'",
      [engineerUid]
    );
    console.log(`Successfully updated ${res.rowCount} rows.`);

    // 3. Final Verification
    const final = await pool.query("SELECT COUNT(*) FROM engineer_form WHERE engineer_id = $1", [engineerUid]);
    console.log(`Final linked count: ${final.rows[0].count}`);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

link();
