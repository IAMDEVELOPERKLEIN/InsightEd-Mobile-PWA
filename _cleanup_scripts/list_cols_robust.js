
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function listAllCols() {
  try {
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'engineer_form'
      ORDER BY column_name;
    `);
    console.log("COLUMNS_START");
    res.rows.forEach(r => console.log(r.column_name));
    console.log("COLUMNS_END");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
listAllCols();
