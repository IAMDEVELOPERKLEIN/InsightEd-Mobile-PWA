const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const s = await pool.query('SELECT COUNT(*) FROM schools');
    console.log('schools table count:', s.rows[0].count);
    const p = await pool.query('SELECT COUNT(*) FROM ph_schools');
    console.log('ph_schools table count:', p.rows[0].count);
  } catch(e) { console.error(e); }
  pool.end();
}
run();
