const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const engineerUid = 'V4kvTSEaaxP1F4kcW3g8Hsc3f0l1';
    
    const count = await pool.query("SELECT COUNT(*) FROM engineer_form WHERE engineer_id = $1", [engineerUid]);
    console.log(`Final count of projects linked to ${engineerUid}: ${count.rows[0].count}`);

    const others = await pool.query("SELECT DISTINCT engineer_name, COUNT(*) FROM engineer_form GROUP BY engineer_name");
    console.log("Projects by name:");
    console.table(others.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
