
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verify() {
  try {
    // 1. Find a project to test with (one that has engineer_id and engineer_name)
    const res = await pool.query('SELECT project_id, engineer_id, engineer_name FROM engineer_form WHERE engineer_id IS NOT NULL AND engineer_name IS NOT NULL LIMIT 1');
    if (res.rows.length === 0) {
      console.log("No projects found to test with.");
      return;
    }
    const original = res.rows[0];
    console.log("Original Ownership:", original);

    // 2. Simulate a PUT update as a different user
    // In actual app, this is done via API, but we'll check the logic in index.js by looking at how the DB is updated.
    // Wait, it's better to check the 'api/index.js' logic by reading the code, which I've already done.
    // Let's check if the column was added successfully.
    const colCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'engineer_form' AND column_name = 'uploader_id_update_moa_rta'
    `);
    console.log("Auditing column exists:", colCheck.rowCount > 0);

    // 3. Check if any RECENT records in engineer_form (history) have the issue or fix
    const recentRes = await pool.query(`
      SELECT engineer_id, engineer_name, uploader_id_update_moa_rta, actions 
      FROM engineer_form 
      ORDER BY project_id DESC LIMIT 5
    `);
    console.log("Recent project rows (history):");
    console.table(recentRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
verify();
