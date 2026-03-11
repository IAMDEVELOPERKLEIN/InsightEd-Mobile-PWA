const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function inspect() {
  try {
    const res = await pool.query("SELECT * FROM engineer_form WHERE project_id = 398");
    console.log("PROJECT 398:", JSON.stringify(res.rows[0], null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

inspect();
