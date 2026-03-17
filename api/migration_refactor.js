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

async function migrate(p) {
  const client = await p.connect();
  try {
    console.log(`Starting migration on ${p.options.connectionString.split('@')[1] || 'local'}`);
    await client.query('BEGIN');

    // 1. Create hrodi_project table
    console.log('Creating hrodi_project table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS hrodi_project (
        hrodi_id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES engineer_form(project_id) ON DELETE CASCADE,
        ipc TEXT,
        moa_pdf TEXT,
        rta_pdf TEXT,
        implementing_agency TEXT,
        implementing_agency_specific TEXT,
        uploader_id_moa_rta TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_project_hrodi UNIQUE(project_id)
      );
    `);

    // 2. Create co_finance table
    console.log('Creating co_finance table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS co_finance (
        finance_id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES engineer_form(project_id) ON DELETE CASCADE,
        ipc TEXT,
        tranche_1 NUMERIC DEFAULT 0,
        tranche_2 NUMERIC DEFAULT 0,
        tranche_3 NUMERIC DEFAULT 0,
        liquidated_tranche_1 NUMERIC DEFAULT 0,
        liquidated_tranche_2 NUMERIC DEFAULT 0,
        liquidated_tranche_3 NUMERIC DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_project_finance UNIQUE(project_id)
      );
    `);

    // 3. Add assignment columns to engineer_form
    console.log('Adding assignment columns to engineer_form...');
    await client.query(`
      ALTER TABLE engineer_form 
      ADD COLUMN IF NOT EXISTS assigned_engineer_id TEXT,
      ADD COLUMN IF NOT EXISTS assigned_engineer_name TEXT;
    `);

    // 4. Migrate data to hrodi_project
    console.log('Migrating data to hrodi_project...');
    // Note: We use moa_pdf (if exists) or moa column. In existing code it seems moa_pdf was used for files.
    // We'll also try to grab data for implementing_agency.
    await client.query(`
      INSERT INTO hrodi_project (project_id, ipc, moa_pdf, rta_pdf, implementing_agency, uploader_id_moa_rta)
      SELECT 
        project_id, 
        ipc, 
        COALESCE(moa_pdf, moa), 
        COALESCE(rta_pdf, rta), 
        implementing_agency,
        uploader_id_update_moa_rta
      FROM engineer_form
      ON CONFLICT (project_id) DO NOTHING;
    `);

    // 5. Migrate data to co_finance
    console.log('Migrating data to co_finance...');
    await client.query(`
      INSERT INTO co_finance (project_id, ipc, tranche_1, tranche_2, tranche_3, liquidated_tranche_1, liquidated_tranche_2, liquidated_tranche_3)
      SELECT 
        project_id, 
        ipc, 
        tranche_1, 
        tranche_2, 
        tranche_3, 
        liquidated_tranche_1, 
        liquidated_tranche_2, 
        liquidated_tranche_3
      FROM engineer_form
      ON CONFLICT (project_id) DO NOTHING;
    `);

    // 6. Drop redundant columns from engineer_form
    console.log('Dropping redundant columns from engineer_form...');
    const columnsToDrop = [
      'internal_description', 'external_description', 'iern', 'status', 
      'implementing_agencies', 'moa', 'rta', 'moa_pdf', 'rta_pdf',
      'tranche_1', 'tranche_2', 'tranche_3',
      'liquidated_tranche_1', 'liquidated_tranche_2', 'liquidated_tranche_3',
      'uploader_id_update_moa_rta'
    ];

    for (const col of columnsToDrop) {
      await client.query(`ALTER TABLE engineer_form DROP COLUMN IF EXISTS ${col};`);
    }

    await client.query('COMMIT');
    console.log('Migration successful!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

async function run() {
  try {
    await migrate(pool);
    if (poolNew) {
      await migrate(poolNew);
    }
  } catch (err) {
    process.exit(1);
  } finally {
    await pool.end();
    if (poolNew) await poolNew.end();
  }
}

run();
