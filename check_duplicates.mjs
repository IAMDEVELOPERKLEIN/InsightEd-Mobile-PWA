import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkDuplicates() {
  try {
    console.log("🔍 Looking for duplicates where (project_id, ipc) are identical...");
    const res = await pool.query(`
      SELECT project_id, ipc, COUNT(*) as duplicate_count
      FROM engineer_form
      GROUP BY project_id, ipc
      HAVING COUNT(*) > 1;
    `);

    if (res.rows.length === 0) {
      console.log("✅ No duplicates found with (project_id, ipc) criteria.");
    } else {
      console.log(`⚠️ Found ${res.rows.length} duplicate groups:`);
      console.table(res.rows);
      
      // Also check for the user's implicit logic: if project_id is the same across different IPCs?
      // No, user said "project id and ipc is the same".
    }
    
    // Check if project_id itself has duplicates (multiple rows for same project_id regardless of IPC)
    console.log("\n🔍 Checking if project_id itself has duplicates...");
    const res2 = await pool.query(`
      SELECT project_id, COUNT(*) as count
      FROM engineer_form
      GROUP BY project_id
      HAVING COUNT(*) > 1;
    `);
    
    if (res2.rows.length > 0) {
      console.log(`⚠️ Found ${res2.rows.length} project_id collisions:`);
      console.table(res2.rows);
    } else {
      console.log("✅ project_id is unique across all rows.");
    }

  } catch (err) {
    console.error('❌ Error executing query:', err.message);
  } finally {
    pool.end();
  }
}

checkDuplicates();
