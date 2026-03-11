import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const res = await pool.query("SELECT project_id, school_name, engineer_id, engineer_name, approved_budget_for_contract, contract_amount FROM engineer_form LIMIT 20");
    console.table(res.rows);
    
    const countRes = await pool.query("SELECT COUNT(*) FROM engineer_form WHERE engineer_id IS NULL");
    console.log(`Total projects with NULL engineer_id: ${countRes.rows[0].count}`);

    const countRes2 = await pool.query("SELECT COUNT(*) FROM engineer_form WHERE engineer_id IS NOT NULL");
    console.log(`Total projects with NOT NULL engineer_id: ${countRes2.rows[0].count}`);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
