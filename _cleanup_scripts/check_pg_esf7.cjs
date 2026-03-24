const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'esf7_database'
    `);
    
    if (res.rows.length > 0) {
      console.log("✅ Table esf7_database exists.");
      const cols = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'esf7_database'
      `);
      console.log(`Table has ${cols.rows.length} columns.`);
      // Check for a few critical columns
      const columnNames = cols.rows.map(c => c.column_name);
      console.log("Critical columns check:", {
        school_id: columnNames.includes('school_id'),
        status: columnNames.includes('status'),
        updated_at: columnNames.includes('updated_at')
      });
    } else {
      console.log("❌ Table esf7_database does NOT exist.");
      console.log("Existing tables:", (await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")).rows.map(r => r.table_name).join(', '));
    }
  } catch (err) {
    console.error("❌ DB Check Error:", err.message);
  } finally {
    await pool.end();
  }
}

check();
