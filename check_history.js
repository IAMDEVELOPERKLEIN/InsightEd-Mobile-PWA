
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkHistory() {
  try {
    const ipc = 'INF-2024-00005';
    console.log(`Checking history for IPC: ${ipc}`);
    const res = await pool.query("SELECT project_id, engineer_id, engineer_name, status_of_construction_phase, actions FROM engineer_form WHERE ipc = $1 ORDER BY project_id ASC", [ipc]);
    res.rows.forEach(r => {
      console.log(` - PID: ${r.project_id}, EngID: ${r.engineer_id}, EngName: ${r.engineer_name}, Status: ${r.status_of_construction_phase}, Action: ${r.actions}`);
    });

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

checkHistory();
