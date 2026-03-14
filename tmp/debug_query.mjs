
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: "postgres://postgres:S9lUpxYIeD08@20.44.209.117:5432/postgres?sslmode=require"
});

async function testQuery() {
  console.log("🔍 Testing Dashboard Query...");
  try {
    const aggregateQuery = `
      SELECT 
        COUNT(*) as total_projects,
        SUM(COALESCE(tranche_1, 0)) as total_tranche_1,
        SUM(COALESCE(tranche_2, 0)) as total_tranche_2,
        SUM(COALESCE(tranche_3, 0)) as total_tranche_3
      FROM (
        SELECT DISTINCT ON (COALESCE(ipc, project_id::text)) 
          tranche_1, tranche_2, tranche_3, moa_pdf, rta_pdf, moa, rta
        FROM engineer_form
        ORDER BY COALESCE(ipc, project_id::text), project_id DESC
      ) Latest
      WHERE ((moa_pdf IS NOT NULL AND moa_pdf <> '') OR (moa IS NOT NULL AND moa <> ''))
      AND ((rta_pdf IS NOT NULL AND rta_pdf <> '') OR (rta IS NOT NULL AND rta <> ''))
    `;
    console.log("Executing aggregateQuery...");
    const res = await pool.query(aggregateQuery);
    console.log("✅ Success!", res.rows[0]);
  } catch (err) {
    console.error("❌ SQL Error:", err.message);
  } finally {
    await pool.end();
  }
}

testQuery();
