const pg = require('pg');
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false }); // Disabled SSL for local debug

async function debug() {
  try {
    const res = await pool.query(`
      SELECT project_id, project_name, ipc, moa, rta, moa_pdf, rta_pdf 
      FROM engineer_form 
      WHERE (NULLIF(moa_pdf, '') IS NOT NULL OR NULLIF(moa, '') IS NOT NULL) 
        AND (NULLIF(rta_pdf, '') IS NOT NULL OR NULLIF(rta, '') IS NOT NULL)
    `);
    console.log("Rows count:", res.rows.length);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
debug();
