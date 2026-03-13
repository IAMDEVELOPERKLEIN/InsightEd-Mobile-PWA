
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkUser() {
  try {
    const identifier = '114434';
    console.log(`🔍 Checking users table for identifier: ${identifier}`);
    
    // Check by email (lowercase) OR iern
    const res = await pool.query(
      'SELECT uid, email, iern, password_hash, passcode, role FROM users WHERE LOWER(email) = LOWER($1) OR CAST(iern AS TEXT) = $1',
      [identifier]
    );
    
    if (res.rows.length > 0) {
      console.log('✅ User Found:');
      console.table(res.rows);
    } else {
      console.log('❌ User NOT found in users table.');
    }
  } catch (err) {
    console.error('Error checking user:', err.message);
  } finally {
    await pool.end();
  }
}

checkUser();
