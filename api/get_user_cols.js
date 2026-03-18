
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: "postgres://postgres:postgres@localhost:5432/postgres"
});

async function checkColumns() {
  try {
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
    console.log("Columns in users table:", res.rows.map(r => r.column_name));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkColumns();
