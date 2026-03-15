require('dotenv').config();
const pg = require('pg');
const fs = require('fs');
const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function exportCols() {
  try {
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'engineer_form' ORDER BY column_name");
    const output = res.rows.map(r => `${r.column_name}: ${r.data_type}`).join('\n');
    fs.writeFileSync('ef_cols_full.txt', output);
    console.log("Exported", res.rows.length, "columns to ef_cols_full.txt");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
exportCols();
