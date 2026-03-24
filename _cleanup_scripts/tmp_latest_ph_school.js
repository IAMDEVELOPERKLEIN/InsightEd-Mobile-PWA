import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: 'e:/InsightEd-Mobile-PWA/.env' });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query('SELECT * FROM ph_schools ORDER BY updated_at DESC NULLS LAST LIMIT 1');
    console.log("--- LATEST PH_SCHOOLS ROW ---");
    console.log(JSON.stringify(res.rows[0], null, 2));
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

run();
