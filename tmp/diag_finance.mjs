import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const dbUrl = process.env.DATABASE_URL;
const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');

const pool = new Pool({
  connectionString: dbUrl,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

async function runDiagnostic() {
  try {
    console.log("--- 1. Checking Table Structure ---");
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'engineer_form'
    `);
    console.log("Columns:", columns.rows.map(r => r.column_name).join(', '));

    console.log("\n--- 2. Running Aggregate Query ---");
    const aggregateQuery = `
      SELECT 
        COUNT(*) as total_projects,
        SUM(COALESCE(tranche_1, 0)) as total_tranche_1,
        SUM(COALESCE(tranche_2, 0)) as total_tranche_2,
        SUM(COALESCE(tranche_3, 0)) as total_tranche_3
      FROM (
        SELECT DISTINCT ON (COALESCE(ipc, project_id::text)) 
          tranche_1, tranche_2, tranche_3
        FROM engineer_form
        WHERE (NULLIF(moa_pdf, '') IS NOT NULL OR NULLIF(moa, '') IS NOT NULL)
          AND (NULLIF(rta_pdf, '') IS NOT NULL OR NULLIF(rta, '') IS NOT NULL)
        ORDER BY COALESCE(ipc, project_id::text), project_id DESC
      ) Latest
    `;
    const aggResult = await pool.query(aggregateQuery);
    console.log("Aggregates:", aggResult.rows[0]);

    console.log("\n--- 3. Running Table Query ---");
    const tableQuery = `
      SELECT DISTINCT ON (COALESCE(ipc, project_id::text)) 
        project_id, project_name, status_of_construction_phase AS status,
        mode_of_project, tranche_1, tranche_2, tranche_3,
        moa_pdf, rta_pdf, moa, rta
      FROM engineer_form
      WHERE (NULLIF(moa_pdf, '') IS NOT NULL OR NULLIF(moa, '') IS NOT NULL)
        AND (NULLIF(rta_pdf, '') IS NOT NULL OR NULLIF(rta, '') IS NOT NULL)
      ORDER BY COALESCE(ipc, project_id::text), project_id DESC
    `;
    const tableResult = await pool.query(tableQuery);
    console.log("Table Row Count:", tableResult.rows.length);
    if (tableResult.rows.length > 0) {
      console.log("First Row Sample:", tableResult.rows[0]);
    }

    console.log("\n--- 4. Checking for NULLs or Empty Strings in IPC/ProjectID ---");
    const nullCheck = await pool.query(`
      SELECT project_id, ipc, moa_pdf, rta_pdf, moa, rta
      FROM engineer_form
      WHERE (NULLIF(moa_pdf, '') IS NOT NULL OR NULLIF(moa, '') IS NOT NULL)
        AND (NULLIF(rta_pdf, '') IS NOT NULL OR NULLIF(rta, '') IS NOT NULL)
      LIMIT 10
    `);
    console.table(nullCheck.rows);

  } catch (err) {
    console.error("❌ Diagnostic Failed:", err);
  } finally {
    await pool.end();
  }
}

runDiagnostic();
