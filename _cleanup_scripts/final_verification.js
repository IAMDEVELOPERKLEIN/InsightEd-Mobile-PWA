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

async function run() {
  try {
    // 1. Check Schema of engineer_form
    const schemaRes = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'engineer_form'
      ORDER BY column_name;
    `);
    console.log("Current columns in engineer_form:");
    const cols = schemaRes.rows.map(r => r.column_name);
    console.log(cols.join(', '));

    // Check specific columns
    const redundantCols = ['tranche_1', 'implementing_agency', 'rta_pdf'];
    redundantCols.forEach(col => {
      if (cols.includes(col)) {
        console.error(`❌ FAILURE: Redundant column ${col} still exists!`);
      } else {
        console.log(`✅ SUCCESS: Redundant column ${col} is gone.`);
      }
    });

    const keepCols = ['assigned_engineer_id', 'assigned_engineer_name', 'date_assigned'];
    keepCols.forEach(col => {
      if (cols.includes(col)) {
        console.log(`✅ SUCCESS: Kept column ${col}.`);
      } else {
        console.error(`❌ FAILURE: Column ${col} was accidentally dropped!`);
      }
    });

    // 2. Check Data Fetching (Simulate /api/projects)
    const dataRes = await pool.query(`
      SELECT 
        e.project_id, e.project_name,
        COALESCE(f.tranche_1, 0) as tranche_1,
        h.implementing_agency
      FROM engineer_form e
      LEFT JOIN co_finance f ON e.project_id = f.project_id
      LEFT JOIN hrodi_project h ON e.project_id = h.project_id
      LIMIT 1;
    `);
    if (dataRes.rows.length > 0) {
      console.log("\nSample Project Data (Joined):");
      console.log(JSON.stringify(dataRes.rows[0], null, 2));
    } else {
      console.log("\nNo projects found to verify data joining.");
    }

  } catch (err) {
    console.error("Verification Error:", err.message);
  } finally {
    await pool.end();
  }
}

run();
