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
    console.log(`\n--- Starting Permanent Cleanup on ${label} ---`);
    await client.query('BEGIN');

    const columnsToDrop = [
      'tranche_1', 'tranche_2', 'tranche_3',
      'liquidated_tranche_1', 'liquidated_tranche_2', 'liquidated_tranche_3',
      'implementing_agencies', 'implementing_agency',
      'rta', 'moa', 'rta_pdf', 'moa_pdf',
      'uploader_id_moa_rta', 'uploader_id_update_moa_rta'
    ];

    for (const col of columnsToDrop) {
      try {
        const checkRes = await client.query(`
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'engineer_form' AND column_name = $1
        `, [col]);
        
        if (checkRes.rowCount > 0) {
          console.log(`Dropping column: ${col}`);
          await client.query(`ALTER TABLE engineer_form DROP COLUMN ${col}`);
        } else {
          console.log(`Column ${col} already dropped or doesn't exist.`);
        }
      } catch (colErr) {
        console.warn(`Warning: Could not drop column ${col}:`, colErr.message);
      }
    }

    await client.query('COMMIT');
    console.log(`Successfully cleaned up ${label}`);
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error(`Cleanup failed on ${label}:`, err.message);
    throw err;
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
    console.log("\n✅ Database optimization complete.");
  } catch (err) {
    process.exit(1);
  } finally {
    await pool.end();
    if (poolNew) await poolNew.end();
  }
}

run();
