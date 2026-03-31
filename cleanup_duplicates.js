
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/insighted'
});

async function cleanup() {
  const client = await pool.connect();
  try {
    console.log("🔍 Checking for project duplicates (same School ID + Project Name)...");
    
    const duplicatesRes = await client.query(`
      SELECT school_id, project_name, MIN(ipc) as canonical_ipc, COUNT(DISTINCT ipc) as ipc_count
      FROM engineer_form
      WHERE ipc IS NOT NULL AND ipc != ''
      GROUP BY school_id, project_name
      HAVING COUNT(DISTINCT ipc) > 1;
    `);

    if (duplicatesRes.rows.length === 0) {
      console.log("✅ No duplicates found requiring IPC unification.");
      return;
    }

    console.log(`🚀 Found ${duplicatesRes.rows.length} projects with duplicate IPCs. Unifying...`);

    for (const dup of duplicatesRes.rows) {
      const { school_id, project_name, canonical_ipc } = dup;
      console.log(`   - Unifying "${project_name}" (School: ${school_id}) -> ${canonical_ipc}`);

      // 1. Update engineer_form
      await client.query(
        "UPDATE engineer_form SET ipc = $1 WHERE school_id = $2 AND project_name = $3",
        [canonical_ipc, school_id, project_name]
      );

      // 2. Update engineer_image
      await client.query(
        "UPDATE engineer_image SET ipc = $1 WHERE project_id IN (SELECT project_id FROM engineer_form WHERE school_id = $2 AND project_name = $3)",
        [canonical_ipc, school_id, project_name]
      );

      // 3. Update engineer_documents
      await client.query(
        "UPDATE engineer_documents SET ipc = $1 WHERE project_id IN (SELECT project_id FROM engineer_form WHERE school_id = $2 AND project_name = $3)",
        [canonical_ipc, school_id, project_name]
      );
    }

    console.log("✅ Cleanup completed successfully! Multiple cards should now be collapsed in the dashboard.");
  } catch (err) {
    console.error("❌ Cleanup failed:", err.message);
  } finally {
    client.release();
    pool.end();
  }
}

cleanup();
