
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkProject() {
  try {
    const pid = 406;
    const res = await pool.query("SELECT * FROM engineer_form WHERE project_id = $1", [pid]);
    if (res.rows.length > 0) {
      const r = res.rows[0];
      console.log(`Project ${pid} Data:`);
      console.log(` - Engineer ID: [${r.engineer_id}] (Type: ${typeof r.engineer_id}, Length: ${r.engineer_id ? r.engineer_id.length : 0})`);
      console.log(` - Engineer Name: [${r.engineer_name}] (Type: ${typeof r.engineer_name}, Length: ${r.engineer_name ? r.engineer_name.length : 0})`);
    } else {
      console.log(`Project ${pid} not found.`);
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

checkProject();
