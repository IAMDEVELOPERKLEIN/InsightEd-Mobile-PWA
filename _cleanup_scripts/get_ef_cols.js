
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function getCols() {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'engineer_form'");
    console.log(res.rows.map(r => r.column_name).join(', '));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

getCols();
