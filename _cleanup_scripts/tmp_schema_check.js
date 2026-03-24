import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: 'e:/InsightEd-Mobile-PWA/.env' });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query('SELECT * FROM ph_schools LIMIT 1');
    fs.writeFileSync('e:/InsightEd-Mobile-PWA/tmp_keys3.json', JSON.stringify(Object.keys(res.rows[0])));
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

run();
