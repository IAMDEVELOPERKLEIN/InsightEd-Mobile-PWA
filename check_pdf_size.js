
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkSize() {
  try {
    const res = await pool.query(`
      SELECT 
        COUNT(*) as total_rows,
        SUM(LENGTH(moa_pdf)) as total_moa_len, 
        SUM(LENGTH(rta_pdf)) as total_rta_len
      FROM engineer_form 
      WHERE moa_pdf IS NOT NULL OR rta_pdf IS NOT NULL
    `);
    const row = res.rows[0];
    console.log(`TOTAL ROWS: ${row.total_rows}`);
    console.log(`TOTAL MOA CHARS: ${row.total_moa_len}`);
    console.log(`TOTAL RTA CHARS: ${row.total_rta_len}`);
    console.log(`APPROX TOTAL SIZE: ${((parseInt(row.total_moa_len || 0) + parseInt(row.total_rta_len || 0)) / 1024 / 1024).toFixed(2)} MB`);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
checkSize();
