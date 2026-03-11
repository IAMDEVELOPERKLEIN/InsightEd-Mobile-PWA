
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkIds() {
  try {
    console.log("Checking unique engineer_id values in engineer_form...");
    const res = await pool.query("SELECT DISTINCT engineer_id FROM engineer_form");
    res.rows.forEach(row => console.log(` - ID: ${row.engineer_id}`));

    console.log("\nChecking unique engineer_name values in engineer_form...");
    const res2 = await pool.query("SELECT DISTINCT engineer_name FROM engineer_form");
    res2.rows.forEach(row => console.log(` - Name: ${row.engineer_name}`));

  } catch (err) {
    console.error("Error checking IDs:", err);
  } finally {
    await pool.end();
  }
}

checkIds();
