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
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'schools_IERN'");
    console.log(res.rows.map(r => r.column_name));
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
