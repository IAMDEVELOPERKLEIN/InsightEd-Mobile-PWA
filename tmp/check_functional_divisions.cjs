const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkTable() {
  try {
    const res = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'functional_divisions'
      );
    `);
    console.log("Does 'functional_divisions' table exist?", res.rows[0].exists);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkTable();
