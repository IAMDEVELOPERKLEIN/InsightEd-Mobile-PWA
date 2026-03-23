const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkIndices() {
  try {
    const res = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'users'
    `);
    console.log("Indices on 'users' table:");
    res.rows.forEach(r => {
      console.log(`${r.indexname}: ${r.indexdef}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkIndices();
