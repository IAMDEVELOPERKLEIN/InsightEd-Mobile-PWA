const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function find() {
  try {
    const res = await pool.query("SELECT uid, first_name, last_name, role, division FROM users WHERE role ILIKE '%engineer%' OR role ILIKE '%hrodi%'");
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

find();
