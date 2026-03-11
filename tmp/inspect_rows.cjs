const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function inspect() {
  try {
    const res = await pool.query("SELECT * FROM engineer_form");
    console.log("TOTAL ROWS:", res.rows.length);
    if (res.rows.length > 0) {
      const r = res.rows[0];
      console.log("FIRST ROW DETAILS:");
      console.log("project_id:", r.project_id);
      console.log("engineer_id:", r.engineer_id, typeof r.engineer_id);
      console.log("engineer_name:", r.engineer_name, typeof r.engineer_name);
      console.log("school_name:", r.school_name);
      console.log("approved_budget_for_contract:", r.approved_budget_for_contract);
      console.log("contract_amount:", r.contract_amount);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

inspect();
