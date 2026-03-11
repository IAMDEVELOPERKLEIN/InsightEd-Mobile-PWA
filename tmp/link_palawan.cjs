const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function link() {
  try {
    const targetUid = 'V4kvTSEaaxP1F4kcW3g8Hsc3f0l1';
    
    // Check how many projects are in Palawan with no engineer_id
    const checkRes = await pool.query("SELECT COUNT(*) FROM engineer_form WHERE division = 'Palawan' AND (engineer_id IS NULL OR engineer_id = '')");
    console.log(`Orphan projects in Palawan: ${checkRes.rows[0].count}`);

    if (parseInt(checkRes.rows[0].count) > 0) {
      const updateRes = await pool.query(
        "UPDATE engineer_form SET engineer_id = $1, engineer_name = 'DepEd Engineer' WHERE division = 'Palawan' AND (engineer_id IS NULL OR engineer_id = '')",
        [targetUid]
      );
      console.log(`Updated ${updateRes.rowCount} projects to engineer ${targetUid}`);
    } else {
      console.log("No orphan projects found for Palawan. Checking all orphan divisions...");
      const allOrphans = await pool.query("SELECT division, region, COUNT(*) FROM engineer_form WHERE engineer_id IS NULL OR engineer_id = '' GROUP BY division, region");
      console.table(allOrphans.rows);
    }

  } catch (err) {
    console.error("Link Error:", err);
  } finally {
    await pool.end();
  }
}

link();
