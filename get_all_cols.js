
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
    if (res.rows.length === 0) {
        console.log("Table is empty, checking schema...");
        const schemaRes = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'engineer_form'");
        console.log(schemaRes.rows.map(r => r.column_name).join(', '));
    } else {
        console.log(Object.keys(res.rows[0]).join(', '));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
getCols();
