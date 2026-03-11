
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkStatus() {
  try {
    const uid = 'xyxbCx7ebGaiceHmD2MvCozK63k1';
    console.log(`Checking project assignments for UID: ${uid} after fix...`);
    const res = await pool.query("SELECT project_id, engineer_id, engineer_name, ipc FROM engineer_form WHERE engineer_id = $1", [uid]);
    console.log(`Found ${res.rows.length} records.`);
    res.rows.forEach(r => console.log(` - PID: ${r.project_id}, IPC: ${r.ipc}, Name: ${r.engineer_name}`));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

checkStatus();
