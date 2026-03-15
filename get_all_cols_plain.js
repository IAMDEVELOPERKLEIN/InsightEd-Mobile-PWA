
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function getCols() {
  try {
    const res = await pool.query('SELECT * FROM engineer_form LIMIT 1');
    const cols = res.rows.length > 0 ? Object.keys(res.rows[0]) : [];
    if (cols.length === 0) {
        const schemaRes = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'engineer_form'");
        schemaRes.rows.forEach(r => console.log(r.column_name));
    } else {
        cols.forEach(c => console.log(c));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
getCols();
