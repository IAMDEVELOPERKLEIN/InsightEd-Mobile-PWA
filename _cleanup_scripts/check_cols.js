
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkCols() {
  try {
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'engineer_form'
      ORDER BY ordinal_position;
    `);
    const cols = res.rows.map(r => r.column_name);
    console.log("COL_CHECK:Has uploaded_by:" + cols.includes('uploaded_by'));
    console.log("COL_CHECK:Has engineer_id:" + cols.includes('engineer_id'));
    console.log("COL_CHECK:Has engineer_name:" + cols.includes('engineer_name'));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
checkCols();
