import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL;
const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');

const pool = new Pool({
  connectionString: dbUrl,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

async function checkCount() {
  try {
    console.log("Checking total rows...");
    const totalRes = await pool.query('SELECT COUNT(*) FROM engineer_form');
    console.log("Total Rows:", totalRes.rows[0].count);

    console.log("Checking rows with MOA/RTA...");
    const moaRtaRes = await pool.query(`
      SELECT COUNT(*) FROM engineer_form 
      WHERE (NULLIF(moa_pdf, '') IS NOT NULL OR NULLIF(moa, '') IS NOT NULL)
        AND (NULLIF(rta_pdf, '') IS NOT NULL OR NULLIF(rta, '') IS NOT NULL)
    `);
    console.log("Rows with MOA/RTA:", moaRtaRes.rows[0].count);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkCount();
