const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkUser() {
  const schoolId = '112426';
  try {
    console.log(`Checking data for School ID: ${schoolId}`);
    
    // Check ph_schools
    const schoolRes = await pool.query("SELECT school_id, school_name, iern FROM ph_schools WHERE school_id = $1", [schoolId]);
    console.log("ph_schools entry:", schoolRes.rows[0]);

    // Check users
    const userRes = await pool.query("SELECT uid, email, role, school_id, passcode, iern, disabled FROM users WHERE school_id = $1", [schoolId]);
    console.log("users table entry:", userRes.rows[0]);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkUser();
