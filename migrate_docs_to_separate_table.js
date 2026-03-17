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

    console.log("1. Creating engineer_documents table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS engineer_documents (
        doc_id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES engineer_form(project_id) ON DELETE CASCADE,
        ipc TEXT,
        pow_pdf TEXT,
        dupa_pdf TEXT,
        contract_pdf TEXT,
        rta_pdf TEXT,
        moa_pdf TEXT,
        uploader_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_project_docs UNIQUE(project_id)
      );
    `);

    console.log("2. Migrating data from engineer_form to engineer_documents...");
    const migrationRes = await client.query(`
      INSERT INTO engineer_documents (project_id, ipc, pow_pdf, dupa_pdf, contract_pdf, rta_pdf, moa_pdf, uploader_id)
      SELECT 
        project_id, 
        ipc, 
        pow_pdf, 
        dupa_pdf, 
        contract_pdf, 
        rta_pdf, 
        moa_pdf, 
        uploader_id_moa_rta
      FROM engineer_form
      ON CONFLICT (project_id) DO UPDATE SET
        pow_pdf = EXCLUDED.pow_pdf,
        dupa_pdf = EXCLUDED.dupa_pdf,
        contract_pdf = EXCLUDED.contract_pdf,
        rta_pdf = EXCLUDED.rta_pdf,
        moa_pdf = EXCLUDED.moa_pdf,
        uploader_id = EXCLUDED.uploader_id;
    `);
    console.log(`   -> Migrated ${migrationRes.rowCount} project document sets.`);

    await client.query('COMMIT');
    console.log("✅ Document migration successful!");

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("❌ Migration failed:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
