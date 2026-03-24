const pg = require('pg');
require('dotenv').config();
const { Pool } = pg;
const dbUrl = process.env.DATABASE_URL;
const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function debug() {
  const baseQuery = `
      SELECT DISTINCT ON (COALESCE(ipc, project_id::text)) 
        project_id, project_name, status_of_construction_phase AS status,
        mode_of_project, tranche_1, tranche_2, tranche_3,
        (NULLIF(moa_pdf, '') IS NOT NULL OR NULLIF(moa, '') IS NOT NULL) AS has_moa,
        (NULLIF(rta_pdf, '') IS NOT NULL OR NULLIF(rta, '') IS NOT NULL) AS has_rta
      FROM engineer_form
      WHERE (NULLIF(moa_pdf, '') IS NOT NULL OR NULLIF(moa, '') IS NOT NULL)
        AND (NULLIF(rta_pdf, '') IS NOT NULL OR NULLIF(rta, '') IS NOT NULL)
      ORDER BY COALESCE(ipc, project_id::text), project_id DESC
    `;

  try {
    const aggRes = await pool.query(`SELECT COUNT(*) as total FROM (${baseQuery}) Latest`);
    console.log("Agg Count:", aggRes.rows[0].total);

    const tableRes = await pool.query(`SELECT * FROM (${baseQuery}) Latest ORDER BY project_id DESC`);
    console.log("Table Count:", tableRes.rows.length);
    if (tableRes.rows.length > 0) {
      console.log("Samples:", tableRes.rows.map(r => r.project_id));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
debug();
