const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkConnectionCount() {
  try {
    const res = await pool.query("SELECT count(*) FROM pg_stat_activity");
    console.log("Total connections to DB:", res.rows[0].count);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkConnectionCount();
