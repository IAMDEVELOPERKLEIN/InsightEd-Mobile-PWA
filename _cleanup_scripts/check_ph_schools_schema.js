import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  try {
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ph_schools'");
    console.log("Columns in ph_schools:", res.rows);
  } catch (err) {
    console.error("Schema Error:", err.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
