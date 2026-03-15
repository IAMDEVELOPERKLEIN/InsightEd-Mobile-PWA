import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    console.log("--- Checking Indexes on engineer_form ---");
    const indexRes = await pool.query(`
      SELECT
        tablename,
        indexname,
        indexdef
      FROM
        pg_indexes
      WHERE
        tablename = 'engineer_form';
    `);
    console.log(JSON.stringify(indexRes.rows, null, 2));

    console.log("\n--- Running EXPLAIN ANALYZE for /api/projects query ---");
    // Mock user ID from the user's error message: 88d2fb7e-aeeb-4f2f-8b86-274ff27b8451
    const engineer_id = '88d2fb7e-aeeb-4f2f-8b86-274ff27b8451';
    
    const sql = `
      EXPLAIN ANALYZE
      WITH LatestProjects AS (
          SELECT DISTINCT ON (COALESCE(ipc, project_id::text)) 
            project_id, school_name, project_name, school_id, division, region, status_of_construction_phase AS status, ipc, engineer_name, engineer_id,
            accomplishment_percentage, approved_budget_for_contract, contract_amount, batch_of_funds, contractor_name, other_remarks,
            status_as_of, target_completion_date, actual_completion_date, notice_to_proceed, latitude, longitude,
            construction_start_date, project_category, scope_of_work,
            number_of_classrooms, number_of_storeys, number_of_sites, funds_utilized,
            actions, savings, funding_year, funding_year_justification, is_donated,
            (moa_pdf IS NOT NULL AND moa_pdf != '') AS "has_moa",
            (rta_pdf IS NOT NULL AND rta_pdf != '') AS "has_rta"
          FROM engineer_form
          ORDER BY COALESCE(ipc, project_id::text), project_id DESC
      )
      SELECT
        p.project_id AS "id", p.school_name AS "schoolName", p.project_name AS "projectName",
        p.school_id AS "schoolId", p.division, p.region, p.status AS "status", p.ipc, p.engineer_name AS "engineerName",
        p.accomplishment_percentage AS "accomplishmentPercentage",
        p.approved_budget_for_contract AS "projectAllocation", 
        p.contract_amount AS "contractAmount", p.contract_amount AS "contract_amount",
        p.batch_of_funds AS "batchOfFunds",
        p.contractor_name AS "contractorName", p.other_remarks AS "otherRemarks",
        p.status_as_of AS "statusAsOf", p.target_completion_date AS "targetCompletionDate",
        p.actual_completion_date AS "actualCompletionDate", p.notice_to_proceed AS "noticeToProceed",
        p.latitude, p.longitude, p.construction_start_date AS "constructionStartDate",
        p.project_category AS "projectCategory", p.scope_of_work AS "scopeOfWork",
        p.number_of_classrooms AS "numberOfClassrooms", p.number_of_storeys AS "numberOfStoreys",
        p.number_of_sites AS "numberOfSites", p.funds_utilized AS "fundsUtilized",
        p.actions AS "updateType",
        p.savings,
        p.funding_year AS "fundingYear",
        p.funding_year AS "funding_year",
        p.funding_year_justification AS "fundingYearJustification",
        p.is_donated AS "isDonated",
        p.is_donated AS "is_donated",
        p.has_moa AS "hasMoa",
        p.has_rta AS "hasRta"
      FROM LatestProjects p
      LEFT JOIN school_profiles sp ON p.school_id = sp.school_id
      WHERE p.engineer_id = $1
      ORDER BY p.project_id DESC
    `;
    
    const explainRes = await pool.query(sql, [engineer_id]);
    explainRes.rows.forEach(row => console.log(row['QUERY PLAN']));

  } catch (err) {
    console.error("Error debugging performance:", err);
  } finally {
    process.exit(0);
  }
}
main();
