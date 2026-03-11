const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function scan() {
  try {
    const res = await pool.query("SELECT project_id, engineer_id, engineer_name FROM engineer_form");
    console.log(`Total rows fetched: ${res.rows.length}`);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

scan();
