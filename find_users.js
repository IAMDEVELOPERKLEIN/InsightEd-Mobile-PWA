const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd' });

async function findUsers() {
  try {
    const res = await pool.query("SELECT uid, first_name, last_name, account_category, role FROM users WHERE role LIKE '%Engineer%' OR account_category LIKE '%Engineer%' OR role = 'CO Finance' LIMIT 10");
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

findUsers();
