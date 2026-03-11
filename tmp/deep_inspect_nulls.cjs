const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function inspect() {
  try {
    const res = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE engineer_id IS NULL) as is_null,
        COUNT(*) FILTER (WHERE engineer_id = '') as is_empty,
        COUNT(*) FILTER (WHERE engineer_id = 'null') as is_string_null,
        COUNT(*) FILTER (WHERE TRIM(engineer_id) = '') as is_whitespace
      FROM engineer_form
    `);
    console.table(res.rows);

    const sample = await pool.query("SELECT project_id, engineer_id, engineer_name FROM engineer_form LIMIT 10");
    console.log("Sample Rows:");
    console.table(sample.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

inspect();
