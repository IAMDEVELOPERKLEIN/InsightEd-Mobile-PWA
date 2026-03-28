const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkQueries() {
  try {
    console.log("Checking active queries...");
    const res = await pool.query(`
      SELECT pid, state, query, wait_event_type, wait_event, query_start
      FROM pg_stat_activity 
      WHERE state != 'idle' AND pid != pg_backend_pid();
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkQueries();
