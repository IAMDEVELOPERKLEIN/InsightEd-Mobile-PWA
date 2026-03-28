import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function checkTriggers() {
  const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    const res = await pool.query("SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'engineer_form'");
    console.log("TRIGGERS:", res.rows);
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

checkTriggers();
