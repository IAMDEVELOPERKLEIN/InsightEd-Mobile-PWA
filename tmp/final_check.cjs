const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function finalCheck() {
  try {
    const res = await pool.query("SELECT COUNT(*) FROM engineer_form WHERE engineer_name IS NOT NULL AND engineer_id IS NULL");
    console.log(`Projects with NAME but NO ID: ${res.rows[0].count}`);

    const res2 = await pool.query("SELECT COUNT(*) FROM engineer_form WHERE engineer_name IS NULL AND engineer_id IS NULL");
    console.log(`Projects with NO NAME and NO ID: ${res2.rows[0].count}`);
    
    const res3 = await pool.query("SELECT DISTINCT engineer_name FROM engineer_form WHERE engineer_id IS NULL");
    console.log("Distinct Names with NULL ID:");
    console.table(res3.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

finalCheck();
