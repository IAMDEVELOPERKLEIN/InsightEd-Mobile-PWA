import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function checkColumns() {
  const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'engineer_form'");
    console.log("COLUMNS:", res.rows.map(r => r.column_name).sort());
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

checkColumns();
