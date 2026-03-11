const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function main() {
  // 1. Preview project 430 and all rows sharing its IPC
  const check = await pool.query(`
    SELECT project_id, ipc, school_name, uploader_type, engineer_id
    FROM engineer_form
    WHERE project_id = 430
    LIMIT 1
  `);
  
  if (check.rows.length === 0) {
    console.log('Project 430 not found.');
    await pool.end();
    return;
  }
  
  const row = check.rows[0];
  console.log('Current row 430:', JSON.stringify(row));
  
  // 2. Fix uploader_type for project_id 430 to 'EFD Engineer'
  const fix = await pool.query(`
    UPDATE engineer_form
    SET uploader_type = 'EFD Engineer'
    WHERE project_id = 430
  `);
  
  console.log('Updated rows:', fix.rowCount);
  
  // 3. Verify
  const verify = await pool.query(`
    SELECT project_id, uploader_type FROM engineer_form WHERE project_id = 430
  `);
  console.log('After fix:', JSON.stringify(verify.rows));
  
  await pool.end();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
