const { Pool } = require('pg');
require('dotenv').config({ path: 'e:/InsightEd-Mobile-PWA/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkOffices() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ph_offices'
    `);
    if (res.rows.length === 0) {
        console.log("Table 'ph_offices' does NOT exist!");
    } else {
        console.log("Columns in 'ph_offices' table:");
        res.rows.forEach(row => {
          console.log(` - ${row.column_name}: ${row.data_type}`);
        });
    }
  } catch (err) {
    console.error("Error checking ph_offices:", err.message);
  } finally {
    await pool.end();
  }
}

checkOffices();
