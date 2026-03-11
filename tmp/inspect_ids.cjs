const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function inspect() {
  try {
    const res = await pool.query("SELECT project_id FROM engineer_form LIMIT 5");
    console.log("PROJECT IDS:", res.rows.map(r => r.project_id));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

inspect();
