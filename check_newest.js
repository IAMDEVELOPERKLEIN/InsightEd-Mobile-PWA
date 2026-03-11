
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkNewest() {
  try {
    console.log("Checking the latest records for some projects...");
    const res = await pool.query(`
      SELECT DISTINCT ON (COALESCE(ipc, project_id::text)) 
        project_id, ipc, engineer_id, engineer_name, school_name 
      FROM engineer_form
      ORDER BY COALESCE(ipc, project_id::text), project_id DESC
      LIMIT 10
    `);
    res.rows.forEach(r => {
      console.log(` - IPC: ${r.ipc}, EngID: ${r.engineer_id}, EngName: ${r.engineer_name}, School: ${r.school_name}`);
    });

  } catch (err) {
    console.error("Error checking newest:", err);
  } finally {
    await pool.end();
  }
}

checkNewest();
