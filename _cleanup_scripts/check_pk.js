
import dotenv from 'dotenv';
import pg from 'pg';
const { Pool } = pg;

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkPK() {
  try {
    const res = await pool.query(`
      SELECT a.attname, format_type(a.atttypid, a.atttypmod) AS data_type
      FROM   pg_index i
      JOIN   pg_attribute a ON a.attrelid = i.indrelid
                           AND a.attnum = ANY(i.indkey)
      WHERE  i.indrelid = 'engineer_form'::regclass
      AND    i.indisprimary;
    `);
    console.log("Primary Key:");
    console.log(JSON.stringify(res.rows, null, 2));

    const res2 = await pool.query(`SELECT project_id, COUNT(*) FROM engineer_form GROUP BY project_id HAVING COUNT(*) > 1`);
    console.log("Duplicate Project IDs:");
    console.log(JSON.stringify(res2.rows, null, 2));

  } catch (err) {
    console.error("Query failed:", err);
  } finally {
    await pool.end();
  }
}

checkPK();
