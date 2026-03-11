
import dotenv from 'dotenv';
import pg from 'pg';
const { Pool } = pg;

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check380() {
  try {
    const res = await pool.query(`SELECT project_id, LENGTH(other_remarks::text) as len FROM engineer_form WHERE project_id = 380`);
    if (res.rows.length > 0) {
      console.log(`FOUND 380: len=${res.rows[0].len}`);
    } else {
      console.log("380 NOT FOUND in engineer_form");
      const res2 = await pool.query(`SELECT project_id FROM engineer_form ORDER BY project_id DESC LIMIT 10`);
      console.log("Recent project IDs:", res2.rows.map(r => r.project_id));
    }
  } catch (err) {
    console.error("Query failed:", err);
  } finally {
    await pool.end();
  }
}

check380();
