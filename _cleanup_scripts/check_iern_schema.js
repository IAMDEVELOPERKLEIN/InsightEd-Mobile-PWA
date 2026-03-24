import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'schools_IERN'");
    console.log("Columns in schools_IERN:", res.rows);
  } catch (err) {
    console.error("Schema Error:", err.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
