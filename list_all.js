
import dotenv from 'dotenv';
import pg from 'pg';
const { Pool } = pg;

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function listAll() {
  try {
    const res = await pool.query(`SELECT project_id, LENGTH(other_remarks::text) as len FROM engineer_form ORDER BY project_id ASC`);
    console.log(`Total rows found: ${res.rows.length}`);
    res.rows.forEach(r => {
      if (r.len > 1000) {
        console.log(`ID: ${r.project_id}, LEN: ${r.len}`);
      }
    });
  } catch (err) {
    console.error("Query failed:", err);
  } finally {
    await pool.end();
  }
}

listAll();
