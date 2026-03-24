import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'ph_schools'");
    const cols = res.rows.map(r => r.column_name);
    console.log("Leg District matches:", cols.filter(c => c.includes('leg')));
    console.log("Mun/City matches:", cols.filter(c => c.includes('mun') || c.includes('city')));
    console.log("IERN matches:", cols.filter(c => c.includes('iern')));
  } catch (err) {
    console.error("Schema Error:", err.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
