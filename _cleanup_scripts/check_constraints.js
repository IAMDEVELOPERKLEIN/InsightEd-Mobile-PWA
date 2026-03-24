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
  try {
    console.log("Checking constraints for engineer_form...");
    const conRes = await pool.query(`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE contypid = 'engineer_form'::regclass;
    `);
    console.log("Constraints:", JSON.stringify(conRes.rows, null, 2));

    const idxRes = await pool.query(`
      SELECT
          t.relname as table_name,
          i.relname as index_name,
          a.attname as column_name,
          ix.indisunique as is_unique
      FROM
          pg_class t,
          pg_class i,
          pg_index ix,
          pg_attribute a
      WHERE
          t.oid = ix.indrelid
          AND i.oid = ix.indexrelid
          AND a.attrelid = t.oid
          AND a.attnum = ANY(ix.indkey)
          AND t.relkind = 'r'
          AND t.relname = 'engineer_form'
      ORDER BY
          t.relname,
          i.relname;
    `);
    console.log("Indexes:", JSON.stringify(idxRes.rows, null, 2));

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

run();
