require('dotenv').config();
const pg = require('pg');
const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function checkSchema() {
  try {
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'engineer_form'");
    const cols = res.rows.map(r => `${r.column_name} (${r.data_type})`);
    console.log("Columns:", cols.join(', '));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
checkSchema();
