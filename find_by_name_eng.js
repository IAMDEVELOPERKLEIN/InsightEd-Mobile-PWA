
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function findByName() {
  try {
    const name = 'Jonathan Narvat';
    console.log(`Searching for projects with engineer_name: ${name}`);
    const res = await pool.query("SELECT project_id, engineer_id, engineer_name, ipc FROM engineer_form WHERE engineer_name = $1", [name]);
    
    console.log(`Found ${res.rows.length} records.`);
    res.rows.forEach(r => {
      console.log(` - PID: ${r.project_id}, EngID: '${r.engineer_id}', IPC: ${r.ipc}`);
    });

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

findByName();
