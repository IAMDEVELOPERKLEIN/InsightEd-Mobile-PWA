
import dotenv from 'dotenv';
import pg from 'pg';
const { Pool } = pg;

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  try {
    const res = await pool.query(`SHOW search_path`);
    console.log("Search Path:", res.rows[0].search_path);

    const res2 = await pool.query(`SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'engineer_form'`);
    console.log("Table Locations:");
    console.log(JSON.stringify(res2.rows, null, 2));

  } catch (err) {
    console.error("Query failed:", err);
  } finally {
    await pool.end();
  }
}

checkSchema();
