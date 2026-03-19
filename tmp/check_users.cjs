const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkCols() {
  try {
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
    console.log("✅ Columns found in users table:", res.rows.map(r => r.column_name));
  } catch (err) {
    console.error("❌ Connection/Query Error:", err.message);
  } finally {
    await pool.end();
  }
}

checkCols();
