
import dotenv from 'dotenv';
import pg from 'pg';
const { Pool } = pg;

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function findMax() {
  try {
    const res = await pool.query(`SELECT project_id, LENGTH(other_remarks) as l FROM engineer_form WHERE other_remarks IS NOT NULL ORDER BY l DESC LIMIT 10`);
    console.log("TOP LENGTHS:");
    res.rows.forEach(r => console.log(`ID: ${r.project_id} LEN: ${r.l}`));
    
    const res2 = await pool.query(`SELECT project_id, LENGTH(actions) as l FROM engineer_form WHERE actions IS NOT NULL ORDER BY l DESC LIMIT 10`);
    console.log("TOP ACTIONS:");
    res2.rows.forEach(r => console.log(`ID: ${r.project_id} LEN: ${r.l}`));

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

findMax();
