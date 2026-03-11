const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  try {
    const engineerUid = 'V4kvTSEaaxP1F4kcW3g8Hsc3f0l1';
    
    // Update projects by name 'Merck Bryan Gragante ' or name ILIKE '%Merck%'
    const updateRes = await pool.query(
      "UPDATE engineer_form SET engineer_id = $1, engineer_name = 'DepEd Engineer' WHERE engineer_name ILIKE '%Merck%' OR engineer_name ILIKE '%Gragante%' OR engineer_name = 'DepEd Engineer'",
      [engineerUid]
    );
    console.log(`Successfully linked ${updateRes.rowCount} projects to the correct UID.`);

    const count = await pool.query("SELECT COUNT(*) FROM engineer_form WHERE engineer_id = $1", [engineerUid]);
    console.log(`Final total projects for engineer: ${count.rows[0].count}`);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

fix();
