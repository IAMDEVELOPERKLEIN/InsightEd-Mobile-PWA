/**
 * verify_col_order.js
 * Queries ph_schools columns ordered by position and writes to verify_output.txt
 */
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT column_name, ordinal_position
      FROM information_schema.columns
      WHERE table_name = 'ph_schools' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    const lines = res.rows.map(r => `${String(r.ordinal_position).padStart(4)}. ${r.column_name}`);
    const out = lines.join('\n');
    fs.writeFileSync(path.join(__dirname, '../verify_output.txt'), out, 'utf8');
    console.log('Written to verify_output.txt');
  } finally {
    client.release();
    await pool.end();
  }
}
run().catch(e => { console.error(e.message); process.exit(1); });
