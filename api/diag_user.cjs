const { Pool } = require('pg');
require('dotenv').config();

async function checkUser() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query('SELECT * FROM users WHERE email_address = $1', ['ro5@deped.gov.ph']);
    if (res.rows.length > 0) {
      console.log("Columns:", Object.keys(res.rows[0]));
    }
    console.log("User data:", res.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

checkUser();
