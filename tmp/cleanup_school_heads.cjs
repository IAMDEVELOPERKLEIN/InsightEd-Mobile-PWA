const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function cleanupUsers() {
  console.log("🚀 Starting Cleanup of School Head Users...");
  try {
    // 1. Count before deletion
    const countRes = await pool.query("SELECT COUNT(*) FROM users WHERE registrant_type = 'School Head'");
    const totalToDelete = countRes.rows[0].count;
    console.log(`📊 Found ${totalToDelete} users with registrant_type 'School Head'.`);

    if (totalToDelete === "0") {
      console.log("✨ No users found to delete. Cleanup unnecessary.");
      return;
    }

    // 2. Perform deletion
    const deleteRes = await pool.query("DELETE FROM users WHERE registrant_type = 'School Head'");
    console.log(`✅ Successfully deleted ${deleteRes.rowCount} users.`);

    // 3. Count after deletion
    const finalCountRes = await pool.query("SELECT COUNT(*) FROM users WHERE registrant_type = 'School Head'");
    console.log(`📌 Final count in users table: ${finalCountRes.rows[0].count}`);

  } catch (err) {
    console.error("❌ Cleanup failed:", err.message);
  } finally {
    await pool.end();
    console.log("🏁 Cleanup process finished.");
  }
}

cleanupUsers();
