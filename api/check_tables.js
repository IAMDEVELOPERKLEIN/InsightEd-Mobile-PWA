import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const ef = await pool.query('SELECT count(*) FROM engineer_form');
    const hp = await pool.query('SELECT count(*) FROM hrodi_project');
    const cf = await pool.query('SELECT count(*) FROM co_finance');
    
    console.log('--- Table Status ---');
    console.log('engineer_form rows:', ef.rows[0].count);
    console.log('hrodi_project rows:', hp.rows[0].count);
    console.log('co_finance rows:', cf.rows[0].count);
    
    const ef_cols = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'engineer_form' 
      AND column_name IN ('tranche_1', 'moa_pdf', 'rta_pdf', 'internal_description')
    `);
    console.log('Redundant columns remaining in EF:', ef_cols.rows.map(r => r.column_name));

    const join_check = await pool.query(`
      SELECT 
        e.project_id, 
        h.moa_pdf IS NOT NULL as has_hrodi,
        f.tranche_1 IS NOT NULL as has_finance
      FROM engineer_form e
      LEFT JOIN hrodi_project h ON e.project_id = h.project_id
      LEFT JOIN co_finance f ON e.project_id = f.project_id
      LIMIT 5
    `);
    console.log('Join verification (sample):');
    console.table(join_check.rows);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

check();
