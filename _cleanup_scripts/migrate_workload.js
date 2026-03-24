import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log("Adding school_id to ph_teachers_workload...");
    await pool.query('ALTER TABLE ph_teachers_workload ADD COLUMN IF NOT EXISTS school_id TEXT;');
    console.log("Success!");
  } catch (err) {
    console.error("Migration failed:", err.message);
  } finally {
    await pool.end();
  }
}

run();
