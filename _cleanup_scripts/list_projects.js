
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function listProjects() {
  try {
    console.log("Listing all projects in engineer_form (brief)...");
    const res = await pool.query("SELECT project_id, ipc, engineer_id, engineer_name, school_name FROM engineer_form");
    res.rows.forEach(row => {
      console.log(` - PID: ${row.project_id}, IPC: ${row.ipc}, EngID: ${row.engineer_id}, EngName: ${row.engineer_name}, School: ${row.school_name}`);
    });

  } catch (err) {
    console.error("Error listing projects:", err);
  } finally {
    await pool.end();
  }
}

listProjects();
