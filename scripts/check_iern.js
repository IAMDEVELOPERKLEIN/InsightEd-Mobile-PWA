import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

import fs from 'fs';
async function checkCols() {
  try {
    const sample = await pool.query('SELECT * FROM "schools_IERN" LIMIT 1');
    fs.writeFileSync('out.json', JSON.stringify(sample.rows[0], null, 2), 'utf8');
    console.log("Wrote out.json");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

checkCols();
