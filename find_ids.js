
import dotenv from 'dotenv';
import pg from 'pg';
const { Pool } = pg;

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function findEngineerIds() {
  try {
    const res = await pool.query("SELECT DISTINCT engineer_id, engineer_name FROM engineer_form WHERE engineer_id IS NOT NULL");
    console.log("Engineer IDs in projects:");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error("Query failed:", err);
  } finally {
    await pool.end();
  }
}

findEngineerIds();
