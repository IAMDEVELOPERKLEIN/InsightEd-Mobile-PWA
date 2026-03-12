const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function find() {
  try {
    const res = await pool.query(`
      SELECT 
        engineer_name, 
        length(engineer_name::text) as len,
        COUNT(*) 
      FROM engineer_form 
      GROUP BY engineer_name 
      ORDER BY 3 DESC
    `);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

find();
