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

async function migrate(p, label) {
  const client = await p.connect();
  try {
    console.log(`\n--- Migrating implementing_agency_specific on ${label} ---`);
    await client.query('BEGIN');

    const result = await client.query(`
      UPDATE hrodi_project h
      SET implementing_agency_specific = e.implementing_agency_specific
      FROM engineer_form e
      WHERE h.project_id = e.project_id
      AND e.implementing_agency_specific IS NOT NULL
      AND e.implementing_agency_specific != ''
      AND (h.implementing_agency_specific IS NULL OR h.implementing_agency_specific = '')
    `);

    console.log(`Migrated ${result.rowCount} records.`);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`Migration failed on ${label}:`, err.message);
  } finally {
    client.release();
  }
}

async function run() {
  try {
    await migrate(pool, 'Primary DB');
    if (poolNew) {
      await migrate(poolNew, 'Secondary DB');
    }
  } finally {
    await pool.end();
    if (poolNew) await poolNew.end();
  }
}

run();
