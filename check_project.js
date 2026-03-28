import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function checkProject() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query('SELECT project_id, project_name, school_name, school_id FROM "engineer_form" WHERE project_id = $1', [100033]);
    console.log("PROJECT 100033 DATA:", res.rows[0]);
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

checkProject();
