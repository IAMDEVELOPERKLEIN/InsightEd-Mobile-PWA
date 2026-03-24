
import dotenv from 'dotenv';
import pg from 'pg';
const { Pool } = pg;

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkAllRows() {
  try {
    const res = await pool.query(`
      SELECT project_id, school_name, ipc, LENGTH(other_remarks::text) as remarks_len
      FROM engineer_form
      WHERE LENGTH(other_remarks::text) > 10000
      ORDER BY remarks_len DESC;
    `);
    
    console.log(`Found ${res.rows.length} rows with remarks > 10,000 chars:`);
    console.log(JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.error("Query failed:", err);
  } finally {
    await pool.end();
  }
}

checkAllRows();
