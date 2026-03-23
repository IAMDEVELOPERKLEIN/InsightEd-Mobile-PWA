
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const res = await pool.query(`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'masterlist_26_30'
      ORDER BY column_name
    `);
    const cols = res.rows.map(r => r.column_name).join(', ');
    fs.writeFileSync('columns.txt', cols);
    console.log("Wrote columns to columns.txt");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
