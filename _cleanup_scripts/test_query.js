import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

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
  p.is_donated AS "is_donated"
FROM LatestProjects p
LEFT JOIN school_profiles sp ON p.school_id = sp.school_id
`;

async function run() {
  const start = Date.now();
  try {
    const res = await pool.query(sql);
    const end = Date.now();
    const json = JSON.stringify(res.rows);
    console.log('Rows:', res.rows.length);
    console.log('Size (bytes):', Buffer.byteLength(json, 'utf8'));
    console.log('Time (ms):', end - start);
    if (res.rows.length > 0) {
      console.log('Sample row size (chars):', JSON.stringify(res.rows[0]).length);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
