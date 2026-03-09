import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const check = await pool.query("SELECT * FROM ph_schools WHERE school_id = '111484'");
    console.log("Check 111484 exists:", check.rowCount > 0);
    if (!check.rowCount) return;

    const query = `UPDATE ph_schools SET has_standard_shifting = $1, unit5_completed = TRUE, verified_as_of = CURRENT_TIMESTAMP WHERE school_id = $2 RETURNING school_id, unit5_completed, has_standard_shifting`;
    const update = await pool.query(query, [true, '111484']);
    
    console.log("UPDATE result:", update.rows[0]);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
