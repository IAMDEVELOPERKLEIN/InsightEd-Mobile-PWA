import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query('SELECT * FROM ph_schools WHERE school_id=$1', ['301891']);
    const row = res.rows[0];
    const result = {};
    Object.keys(row).forEach(k => {
      if (k.startsWith('shift_') || k.startsWith('mode_') || k.includes('adm')) result[k] = row[k];
    });
    fs.writeFileSync('all_modal_debug.json', JSON.stringify(result, null, 2), 'utf-8');
  } catch(e) { console.error(e) }
  pool.end();
}
run();
