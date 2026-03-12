
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function findAssigned() {
  try {
    const uid = 'xyxbCx7ebGaiceHmD2MvCozK63k1';
    console.log(`Searching for all records assigned to UID: ${uid}`);
    const res = await pool.query("SELECT project_id, ipc, engineer_name, school_name, actions FROM engineer_form WHERE engineer_id = $1", [uid]);
    
    if (res.rows.length === 0) {
      console.log("No records found with this engineer_id.");
    } else {
      console.log(`Found ${res.rows.length} records.`);
      res.rows.forEach(r => {
        console.log(` - PID: ${r.project_id}, IPC: ${r.ipc}, Name: ${r.engineer_name}, School: ${r.school_name}, Action: ${r.actions}`);
      });
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

findAssigned();
