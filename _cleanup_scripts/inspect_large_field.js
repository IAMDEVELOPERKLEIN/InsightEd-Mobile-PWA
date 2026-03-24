
import dotenv from 'dotenv';
import pg from 'pg';
const { Pool } = pg;

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function inspectLargeField() {
  try {
    const res = await pool.query('SELECT project_id, other_remarks FROM engineer_form WHERE project_id = 380');
    if (res.rows.length > 0) {
      const remarks = res.rows[0].other_remarks || "";
      console.log(`Project ID: 380`);
      console.log(`Remarks Length: ${remarks.length}`);
      console.log(`First 500 chars: ${remarks.substring(0, 500)}`);
      console.log(`Last 500 chars: ${remarks.substring(remarks.length - 500)}`);
    } else {
      console.log("Project 380 not found.");
    }
  } catch (err) {
    console.error("Query failed:", err);
  } finally {
    await pool.end();
  }
}

inspectLargeField();
