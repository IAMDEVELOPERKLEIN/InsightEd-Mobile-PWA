
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function findTargetProject() {
  try {
    // Find projects that should be in Agency Dashboard
    const agencyProjects = await pool.query(`
      SELECT 
        project_id, 
        project_name, 
        moa_pdf, 
        rta_pdf, 
        tranche_1, 
        implementing_agencies
      FROM engineer_form
      WHERE NULLIF(moa_pdf, '') IS NOT NULL 
        AND NULLIF(rta_pdf, '') IS NOT NULL
        AND tranche_1 IS NOT NULL
      ORDER BY project_id DESC
    `);
    
    if (agencyProjects.rows.length > 0) {
      console.log("Found project(s) following the full flow:");
      agencyProjects.rows.forEach(p => {
        console.log(`ID: ${p.project_id}, Name: ${p.project_name}, Agency: ${p.implementing_agencies}, T1: ${p.tranche_1}`);
      });
    } else {
      console.log("No projects found with full flow (MOA+RTA+T1).");
    }

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

findTargetProject();
