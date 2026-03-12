const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function audit() {
  try {
    const total = await pool.query("SELECT COUNT(*) FROM engineer_form");
    console.log(`Total rows in engineer_form: ${total.rows[0].count}`);

    const res = await pool.query("SELECT * FROM engineer_form LIMIT 5");
    console.log(`Found ${res.rows.length} rows with LIMIT 5`);

    const nullIds = await pool.query("SELECT COUNT(*) FROM engineer_form WHERE engineer_id IS NULL");
    console.log(`Rows where engineer_id IS NULL: ${nullIds.rows[0].count}`);

    const res2 = await pool.query("SELECT project_id, school_name, engineer_name, engineer_id FROM engineer_form WHERE engineer_id IS NULL LIMIT 20");
    console.log(`Detail for NULL id rows count: ${res2.rows.length}`);
    res2.rows.forEach((r, i) => {
        console.log(`[${i}] ${r.project_id} | ${r.school_name} | ${r.engineer_name}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

audit();
