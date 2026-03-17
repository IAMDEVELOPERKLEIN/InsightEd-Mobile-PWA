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

const poolNew = process.env.NEW_DATABASE_URL ? new Pool({
  connectionString: process.env.NEW_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
}) : null;

async function cleanup(p, label) {
  const client = await p.connect();
  try {
    console.log(`\n--- Cleaning up implementing_agency_specific on ${label} ---`);
    await client.query('BEGIN');

    const checkRes = await client.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'engineer_form' AND column_name = 'implementing_agency_specific'
    `);
    
    if (checkRes.rowCount > 0) {
      console.log(`Dropping column: implementing_agency_specific`);
      await client.query(`ALTER TABLE engineer_form DROP COLUMN implementing_agency_specific`);
    } else {
      console.log(`Column already dropped.`);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`Cleanup failed on ${label}:`, err.message);
  } finally {
    client.release();
  }
}

async function run() {
  try {
    await cleanup(pool, 'Primary DB');
    if (poolNew) {
      await cleanup(poolNew, 'Secondary DB');
    }
  } finally {
    await pool.end();
    if (poolNew) await poolNew.end();
  }
}

run();
