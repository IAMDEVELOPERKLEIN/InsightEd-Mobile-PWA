import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verifyFixes() {
  try {
    console.log("Testing FIXED Projects SQL...");
    let projectsSql = `
      WITH LatestProjects AS (
          SELECT DISTINCT ON (COALESCE(e.ipc, e.project_id::text)) 
            e.project_id, e.school_name, e.project_name, e.school_id, e.division, e.region, e.status_of_construction_phase AS status, e.ipc, e.engineer_name, e.engineer_id,
            e.accomplishment_percentage, e.approved_budget_for_contract, e.contract_amount, e.batch_of_funds, e.contractor_name, e.other_remarks,
            e.status_as_of, e.target_completion_date, e.actual_completion_date, e.notice_to_proceed, e.latitude, e.longitude,
            e.construction_start_date, e.project_category, e.scope_of_work,
            e.number_of_classrooms, e.number_of_storeys, e.number_of_sites, e.funds_utilized,
            e.actions, e.savings, e.funding_year, e.funding_year_justification, e.is_donated,
            (NULLIF(h.moa_pdf, '') IS NOT NULL) AS has_moa,
            (NULLIF(h.rta_pdf, '') IS NOT NULL) AS has_rta,
            h.moa_pdf, h.rta_pdf,
            COALESCE(h.implementing_agency, e.implementing_agency) AS implementing_agency
          FROM engineer_form e
          LEFT JOIN hrodi_project h ON e.project_id = h.project_id
          ORDER BY COALESCE(e.ipc, e.project_id::text), e.project_id DESC
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
        (p.actions LIKE 'Realignment%') AS "isRealigned",
        p.savings,
        p.funding_year AS "fundingYear",
        p.funding_year AS "funding_year",
        p.funding_year_justification AS "fundingYearJustification",
        p.is_donated AS "isDonated",
        p.is_donated AS "is_donated",
        p.has_moa AS "hasMoa",
        p.has_rta AS "hasRta",
        p.moa_pdf,
        p.rta_pdf
      FROM LatestProjects p
    `;
    const projectsRes = await pool.query(projectsSql);
    console.log(`✅ Projects SQL Success: Found ${projectsRes.rows.length} projects.`);

    console.log("\nTesting FIXED School-By-User SQL...");
    let schoolSql = `SELECT * FROM school_profiles WHERE submitted_by = $1`;
    const schoolRes = await pool.query(schoolSql, ['test-uid']);
    console.log(`✅ School-By-User SQL Success.`);

  } catch (err) {
    console.error("\n❌ SQL Error:", err.message);
  } finally {
    await pool.end();
  }
}

verifyFixes();
