
import pg from 'pg';
const { Pool } = pg;

const connectionString = "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd";

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const client = await pool.connect();
    console.log("Connected to DB");

    console.log("\n--- DEPED ENGINEERS IN USERS TABLE ---");
    const engineers = await client.query("SELECT uid, email, first_name, last_name FROM users WHERE role = 'DepEd Engineer' OR role = 'deped_engineer' LIMIT 5");
    console.log(JSON.stringify(engineers.rows, null, 2));

    console.log("\n--- DISTINCT ENGINEER IDS AND NAMES IN ENGINEER_FORM ---");
    const distinctEngineers = await client.query("SELECT DISTINCT engineer_id, engineer_name FROM engineer_form LIMIT 20");
    console.log(JSON.stringify(distinctEngineers.rows, null, 2));

    console.log("\n--- PROJECTS WITHOUT ENGINEER_ID ---");
    const missingId = await client.query("SELECT project_id, school_name, engineer_name FROM engineer_form WHERE engineer_id IS NULL OR engineer_id = '' LIMIT 5");
    console.log(JSON.stringify(missingId.rows, null, 2));

    client.release();
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
