
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkTable() {
  try {
    console.log("Querying engineer_form count...");
    const start = Date.now();
    const res = await pool.query('SELECT COUNT(*) FROM engineer_form');
    const end = Date.now();
    console.log(`Count: ${res.rows[0].count}, Time: ${end - start}ms`);

    console.log("Querying first 5 projects...");
    const res2 = await pool.query('SELECT project_id, school_name, engineer_id FROM engineer_form LIMIT 5');
    console.table(res2.rows);

  } catch (err) {
    console.error("Error querying table:", err);
  } finally {
    await pool.end();
  }
}

checkTable();
