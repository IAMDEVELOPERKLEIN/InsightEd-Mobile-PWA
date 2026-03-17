import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log("1. Adding columns to engineer_form...");
    await client.query(`
      ALTER TABLE engineer_form 
      ADD COLUMN IF NOT EXISTS moa_pdf TEXT,
      ADD COLUMN IF NOT EXISTS rta_pdf TEXT,
      ADD COLUMN IF NOT EXISTS implementing_agency TEXT,
      ADD COLUMN IF NOT EXISTS implementing_agency_specific TEXT,
      ADD COLUMN IF NOT EXISTS uploader_id_moa_rta TEXT;
    `);

    console.log("2. Migrating data from hrodi_project to engineer_form...");
    // We join on project_id and update the columns in engineer_form
    const migrationRes = await client.query(`
      UPDATE engineer_form e
      SET 
        moa_pdf = h.moa_pdf,
        rta_pdf = h.rta_pdf,
        implementing_agency = h.implementing_agency,
        implementing_agency_specific = h.implementing_agency_specific,
        uploader_id_moa_rta = h.uploader_id_moa_rta
      FROM hrodi_project h
      WHERE e.project_id = h.project_id;
    `);
    console.log(`   -> Migrated ${migrationRes.rowCount} rows.`);

    await client.query('COMMIT');
    console.log("✅ Migration successful!");

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("❌ Migration failed:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
