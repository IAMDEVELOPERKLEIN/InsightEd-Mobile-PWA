const pg = require('pg');
const pool = new pg.Pool({ 
  connectionString: 'postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd',
  ssl: { rejectUnauthorized: false }
});

async function findUsers() {
  try {
    const res = await pool.query("SELECT uid, first_name, last_name, role FROM users LIMIT 20");
    console.log(JSON.stringify(res.rows));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

findUsers();
