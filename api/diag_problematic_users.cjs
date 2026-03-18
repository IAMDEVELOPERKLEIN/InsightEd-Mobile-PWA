
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkUsers() {
  const schoolIds = ['130941', '114448', '113681', '111841'];
  try {
    const res = await pool.query('SELECT uid, email, role, hash_version, school_id FROM users WHERE school_id = ANY($1)', [schoolIds]);
    console.log('User Data:', JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error checking users:', err);
  } finally {
    await pool.end();
  }
}

checkUsers();
