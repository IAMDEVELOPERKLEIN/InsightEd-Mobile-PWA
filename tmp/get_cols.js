import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function getCols() {
  try {
    const res = await pool.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_NAME = 'engineer_form'");
    console.log("Columns:", res.rows.map(r => r.column_name).join(', '));
    
    const sample = await pool.query("SELECT * FROM engineer_form WHERE engineer_id IS NULL LIMIT 5");
    console.log("Sample rows with NULL engineer_id:");
    console.log(JSON.stringify(sample.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

getCols();
