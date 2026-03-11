const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function debug() {
  try {
    const res = await pool.query(`
      SELECT 
        project_id, 
        engineer_id, 
        pg_typeof(engineer_id) as type,
        length(engineer_id::text) as len
      FROM engineer_form 
      LIMIT 10
    `);
    console.table(res.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

debug();
