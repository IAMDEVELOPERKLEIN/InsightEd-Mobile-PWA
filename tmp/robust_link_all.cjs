const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function linkAll() {
  try {
    const engineerUid = 'V4kvTSEaaxP1F4kcW3g8Hsc3f0l1';
    
    const before = await pool.query("SELECT COUNT(*) FROM engineer_form WHERE engineer_id IS NULL OR engineer_id = ''");
    console.log(`Orphan projects before update: ${before.rows[0].count}`);
    
    const updateRes = await pool.query(
      "UPDATE engineer_form SET engineer_id = $1, engineer_name = 'DepEd Engineer' WHERE engineer_id IS NULL OR engineer_id = ''",
      [engineerUid]
    );
    console.log(`Successfully linked ${updateRes.rowCount} projects.`);
    
    const after = await pool.query("SELECT COUNT(*) FROM engineer_form WHERE engineer_id = $1", [engineerUid]);
    console.log(`Total projects for this engineer after update: ${after.rows[0].count}`);

  } catch (err) {
    console.error("Link All Error:", err);
  } finally {
    await pool.end();
  }
}

linkAll();
