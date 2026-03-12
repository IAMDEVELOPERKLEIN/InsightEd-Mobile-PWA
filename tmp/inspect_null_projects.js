import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function inspect() {
  try {
    const res = await pool.query("SELECT project_id, school_name, engineer_id, engineer_name, region, division FROM engineer_form WHERE engineer_id IS NULL LIMIT 20");
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

inspect();
