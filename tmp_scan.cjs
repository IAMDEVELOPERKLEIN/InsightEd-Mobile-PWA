const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runScan() {
  try {
    console.log('--- EXHAUSTIVE DUPLICATE SCAN BY ANTIGRAVITY ---');
    
    // 1. Total Rows
    const total = await pool.query('SELECT COUNT(*) FROM engineer_form');
    console.log(`Total Records in engineer_form: ${total.rows[0].count}`);

    // 2. Strict ID + IPC Duplicates (What the user asked for)
    const strictRes = await pool.query(`
      SELECT project_id, ipc, COUNT(*) 
      FROM engineer_form 
      GROUP BY project_id, ipc 
      HAVING COUNT(*) > 1
    `);
    console.log(`Exact duplicates (Same Project ID + Same IPC): ${strictRes.rows.length}`);
    if (strictRes.rows.length > 0) console.table(strictRes.rows);

    // 3. Identification Duplicates (Same School + Same Project Name)
    const identityRes = await pool.query(`
      SELECT school_id, project_name, COUNT(*) 
      FROM engineer_form 
      GROUP BY school_id, project_name 
      HAVING COUNT(*) > 1
    `);
    console.log(`Identification duplicates (Same School ID + Same Project Name): ${identityRes.rows.length}`);
    if (identityRes.rows.length > 0) console.table(identityRes.rows);

    // 4. Shared IPCs (Updates)
    const sharedIpcRes = await pool.query(`
      SELECT ipc, COUNT(*) 
      FROM engineer_form 
      WHERE ipc IS NOT NULL AND ipc != ''
      GROUP BY ipc 
      HAVING COUNT(*) > 1
    `);
    console.log(`Shared IPCs (Possible Updates across different Project IDs): ${sharedIpcRes.rows.length}`);
    if (sharedIpcRes.rows.length > 0) console.table(sharedIpcRes.rows);

    // 5. Completely Identical Rows (except for project_id)
    // We check a subset of standard columns
    const nearIdenticalRes = await pool.query(`
      SELECT school_id, project_name, ipc, region, division, district, COUNT(*)
      FROM engineer_form
      GROUP BY school_id, project_name, ipc, region, division, district
      HAVING COUNT(*) > 1
    `);
    console.log(`Near-identical duplicates (Exactly same School/Project/IPC/Location): ${nearIdenticalRes.rows.length}`);
    if (nearIdenticalRes.rows.length > 0) console.table(nearIdenticalRes.rows);

  } catch (err) {
    console.error('Scan Error:', err.message);
  } finally {
    await pool.end();
  }
}

runScan();
