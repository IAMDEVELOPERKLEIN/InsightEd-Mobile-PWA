
import dotenv from 'dotenv';
import pg from 'pg';
const { Pool } = pg;

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkColumns() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'engineer_form';
    `);
    console.log("Columns in engineer_form:");
    console.log(JSON.stringify(res.rows, null, 2));

    const res2 = await pool.query(`SELECT COUNT(*) FROM engineer_form;`);
    console.log(`Total rows: ${res2.rows[0].count}`);

    const res3 = await pool.query(`SELECT project_id, LENGTH(other_remarks) as len FROM engineer_form ORDER BY len DESC LIMIT 5;`);
    console.log("Top 5 largest remarks:");
    console.log(JSON.stringify(res3.rows, null, 2));

  } catch (err) {
    console.error("Query failed:", err);
  } finally {
    await pool.end();
  }
}

checkColumns();
