const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log("--- ph_schools schema ---");
    const resSchools = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ph_schools'
    `);
    resSchools.rows.forEach(row => {
      console.log(` - ${row.column_name}: ${row.data_type}`);
    });

    console.log("\n--- sample user with password/passcode ---");
    const resUser = await pool.query(`
      SELECT school_id, password_hash, password_salt, hash_version, passcode, role
      FROM users
      WHERE school_id IS NOT NULL AND (password_hash IS NOT NULL OR passcode IS NOT NULL)
      LIMIT 1
    `);
    console.log(JSON.stringify(resUser.rows, null, 2));

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

run();
