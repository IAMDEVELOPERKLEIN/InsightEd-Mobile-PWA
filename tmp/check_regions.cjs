const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function checkRegions() {
  try {
    const res = await pool.query("SELECT region, division, COUNT(*) FROM engineer_form WHERE engineer_id IS NULL GROUP BY region, division");
    console.log("Orphan Projects by Region/Division:");
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkRegions();
