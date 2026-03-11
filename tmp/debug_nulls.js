import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
  ssl: { rejectUnauthorized: false }
});

async function debug() {
  try {
    const res = await pool.query("SELECT engineer_id, COUNT(*) FROM engineer_form GROUP BY engineer_id");
    console.log("Groups by engineer_id:");
    console.table(res.rows);
    
    // Check if there are any rows at all
    const total = await pool.query("SELECT COUNT(*) FROM engineer_form");
    console.log(`Total rows in engineer_form: ${total.rows[0].count}`);

    const res2 = await pool.query("SELECT project_id, school_name, engineer_name FROM engineer_form WHERE engineer_id IS NULL OR engineer_id = '' LIMIT 20");
     console.log("Rows with engineer_id IS NULL or empty:");
    console.table(res2.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

debug();
