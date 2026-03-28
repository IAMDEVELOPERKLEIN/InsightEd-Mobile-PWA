const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function getCols() {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'import_beff_projects'");
    console.log(res.rows.map(r => r.column_name).sort());
  } catch (err) {
    console.error(err.message);
  } finally {
    await pool.end();
  }
}

getCols();
