import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config(); // Assuming it will be run from ROOT

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  try {
    const r1 = await pool.query("SELECT * FROM ph_schools WHERE school_id = '999003'");
    console.log("ph_schools:", r1.rows);
    if (r1.rows.length > 0 && r1.rows[0].iern) {
      const r3 = await pool.query("SELECT * FROM ph_school_completion WHERE iern = $1", [r1.rows[0].iern]);
      console.log("completion:", r3.rows);
    } else {
        console.log("No iern found or school doesn't exist");
    }
  } catch(e) { console.error(e); } finally { pool.end(); }
}
check();
