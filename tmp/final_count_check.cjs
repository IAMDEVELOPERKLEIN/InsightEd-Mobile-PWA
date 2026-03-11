const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const engineerUid = 'V4kvTSEaaxP1F4kcW3g8Hsc3f0l1';
    
    const linkedCount = await pool.query("SELECT COUNT(*) FROM engineer_form WHERE engineer_id = $1", [engineerUid]);
    const nullCount = await pool.query("SELECT COUNT(*) FROM engineer_form WHERE engineer_id IS NULL OR engineer_id = ''");
    const totalCount = await pool.query("SELECT COUNT(*) FROM engineer_form");
    
    console.log(`Total projects in table: ${totalCount.rows[0].count}`);
    console.log(`Linked to ${engineerUid}: ${linkedCount.rows[0].count}`);
    console.log(`Orphan projects: ${nullCount.rows[0].count}`);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
