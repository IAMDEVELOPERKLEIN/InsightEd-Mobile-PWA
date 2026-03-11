
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testEndpoint() {
  try {
    const engineer_id = 'xyxbCx7ebGaiceHmD2MvCozK63k1';
    console.log(`Testing query for engineer_id: ${engineer_id}`);
    
    const sql = `
      WITH LatestProjects AS (
          SELECT DISTINCT ON (COALESCE(ipc, project_id::text)) 
            project_id, school_name, project_name, school_id, division, region, status_of_construction_phase AS status, ipc, engineer_name, engineer_id,
            accomplishment_percentage, approved_budget_for_contract, contract_amount, batch_of_funds, contractor_name, other_remarks,
            status_as_of, target_completion_date, actual_completion_date, notice_to_proceed, latitude, longitude,
            construction_start_date, project_category, scope_of_work,
            number_of_classrooms, number_of_storeys, number_of_sites, funds_utilized,
            actions, savings, funding_year, funding_year_justification, is_donated
          FROM engineer_form
          ORDER BY COALESCE(ipc, project_id::text), project_id DESC
      )
      SELECT
        p.project_id AS "id", p.school_name AS "schoolName", p.project_name AS "projectName",
        p.school_id AS "schoolId", p.division, p.region, p.status AS "status", p.ipc, p.engineer_name AS "engineerName"
      FROM LatestProjects p
      WHERE p.engineer_id = $1
    `;

    const res = await pool.query(sql, [engineer_id]);
    console.log(`Results found: ${res.rows.length}`);
    res.rows.forEach(r => console.log(` - ${r.schoolName}: ${r.status}`));

  } catch (err) {
    console.error("Error testing endpoint query:", err);
  } finally {
    await pool.end();
  }
}

testEndpoint();
