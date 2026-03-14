
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkProjects() {
  try {
    const res = await pool.query(`
      SELECT 
        project_id, 
        project_name, 
        moa_pdf, 
        rta_pdf, 
        tranche_1, 
        tranche_2, 
        tranche_3,
        implementing_agencies,
        mode_of_project
      FROM engineer_form
      ORDER BY project_id DESC
      LIMIT 20
    `);
    
    console.log("Latest 20 Projects:");
    console.table(res.rows.map(r => ({
      id: r.project_id,
      name: r.project_name ? r.project_name.substring(0, 20) : 'N/A',
      moa: !!r.moa_pdf,
      rta: !!r.rta_pdf,
      t1: r.tranche_1,
      agency: r.implementing_agencies,
      mode: r.mode_of_project
    })));

    const financeCount = await pool.query(`
      SELECT COUNT(*) FROM engineer_form 
      WHERE NULLIF(moa_pdf, '') IS NOT NULL 
        AND NULLIF(rta_pdf, '') IS NOT NULL
    `);
    console.log("Projects visible to Finance (has MOA & RTA):", financeCount.rows[0].count);

    const agencyCount = await pool.query(`
      SELECT COUNT(*) FROM engineer_form 
      WHERE (mode_of_project = 'MOA' OR (NULLIF(moa_pdf, '') IS NOT NULL AND NULLIF(rta_pdf, '') IS NOT NULL))
        AND (implementing_agencies IS NOT NULL OR implementing_agency_specific IS NOT NULL)
        AND (tranche_1 IS NOT NULL OR tranche_2 IS NOT NULL OR tranche_3 IS NOT NULL)
    `);
    console.log("Projects visible to Agency (has MOA/RTA + ANY Tranche):", agencyCount.rows[0].count);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkProjects();
