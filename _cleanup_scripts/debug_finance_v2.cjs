require('dotenv').config();
const pg = require('pg');
const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

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
    const aggResult = await pool.query(`SELECT COUNT(*) as total FROM (${baseQuery}) Latest`);
    console.log("Agg Count:", aggResult.rows[0].total);

    const tableResult = await pool.query(`SELECT * FROM (${baseQuery}) Latest ORDER BY project_id DESC`);
    console.log("Table Count:", tableResult.rows.length);
    
    if (tableResult.rows.length > 0) {
      console.log("First Project ID:", tableResult.rows[0].project_id);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
debug();
