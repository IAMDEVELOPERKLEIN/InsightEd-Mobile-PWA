const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const res = await pool.query(`
      SELECT column_name, is_generated, generation_expression 
      FROM information_schema.columns 
      WHERE table_name = 'ph_schools' AND column_name = 'unit_completion'
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

check();
