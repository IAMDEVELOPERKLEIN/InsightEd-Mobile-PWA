const { Pool } = require('pg');

const dbUrl = 'postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd';
const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');

const pool = new Pool({
  connectionString: dbUrl,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

async function check() {
  try {
    const res = await pool.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'esf7_database' AND column_name = 'iern'
    `);
    console.log(res.rows.length > 0 ? 'EXISTS' : 'MISSING');
  } catch (err) {
    console.error('Connection Error:', err.message);
  } finally {
    await pool.end();
  }
}
check();
