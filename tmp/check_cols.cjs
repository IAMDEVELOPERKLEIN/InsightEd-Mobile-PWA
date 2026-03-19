
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
    console.log("Connecting to:", process.env.DATABASE_URL ? "(URL present)" : "(URL MISSING)");
    const client = await pool.connect();
    console.log("✅ Successfully connected to pool.");
    
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ph_schools' 
      AND column_name LIKE 'unit%'
    `);
    console.log("✅ Columns found:", res.rows.map(r => r.column_name));
    
    const userRes = await pool.query("SELECT COUNT(*) FROM users");
    console.log("✅ User count:", userRes.rows[0].count);
    
    client.release();
  } catch (err) {
    console.error("❌ Connection/Query Error:", err.message);
  } finally {
    await pool.end();
  }
}

checkCols();
