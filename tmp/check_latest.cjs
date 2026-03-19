const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkLatest() {
  try {
    const res = await pool.query(`
      SELECT u.school_id, u.email, s.curricular_offering, s.unit1, s.unit1_completed, u.created_at
      FROM users u
      LEFT JOIN ph_schools s ON u.school_id = s.school_id
      WHERE u.role = 'School Head'
      ORDER BY u.created_at DESC
      LIMIT 1
    `);
    console.log("✅ Latest registration:", res.rows[0]);
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await pool.end();
  }
}

checkLatest();
