import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function verify() {
  const schoolId = '114231';
  try {
    console.log("--- USER TABLE ---");
    const userRes = await pool.query("SELECT uid, email, school_id, first_name FROM users WHERE school_id = $1", [schoolId]);
    console.log(userRes.rows);

    console.log("\n--- PH_SCHOOLS TABLE ---");
    const schoolRes = await pool.query("SELECT school_id, school_name, latitude, longitude FROM ph_schools WHERE school_id = $1", [schoolId]);
    console.log(schoolRes.rows);
  } catch (err) {
    console.error("Verification error:", err);
  } finally {
    await pool.end();
  }
}

verify();
