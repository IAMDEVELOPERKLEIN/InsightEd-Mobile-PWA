import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function list() {
  try {
    const res = await pool.query("SELECT DISTINCT engineer_name FROM engineer_form WHERE engineer_id IS NULL");
    console.log("Distinct Engineer Names with NULL ID:");
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

list();
