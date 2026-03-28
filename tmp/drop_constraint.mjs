
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log("Checking for constraint 'engineer_form_ipc_unique_final'...");
    const checkRes = await pool.query(`
      SELECT conname 
      FROM pg_constraint 
      WHERE conname = 'engineer_form_ipc_unique_final';
    `);

    if (checkRes.rows.length > 0) {
      console.log("Constraint found. Attempting to drop it...");
      await pool.query('ALTER TABLE "engineer_form" DROP CONSTRAINT "engineer_form_ipc_unique_final";');
      console.log("✅ Constraint 'engineer_form_ipc_unique_final' dropped successfully.");
    } else {
      console.log("❌ Constraint 'engineer_form_ipc_unique_final' not found.");
      
      // List all unique constraints on engineer_form
      try {
        const listRes = await pool.query(`
          SELECT conname, pg_get_constraintdef(oid) 
          FROM pg_constraint 
          WHERE conrelid = '"engineer_form"'::regclass;
        `);
        console.log("All constraints on 'engineer_form':", listRes.rows);
      } catch (e) {
        console.log("Could not list constraints:", e.message);
      }
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await pool.end();
  }
}

run();
