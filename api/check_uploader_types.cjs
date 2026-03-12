const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function main() {
  // 1. Get HRODI Engineer UIDs
  const hrodiResult = await pool.query(`
    SELECT uid, first_name, last_name, role 
    FROM users 
    WHERE role = 'HRODI Engineer' OR role = 'EFD' OR role = 'EFD Engineer'
  `);
  
  console.log('HRODI Engineers:');
  hrodiResult.rows.forEach(r => console.log(`  ${r.uid}: ${r.first_name} ${r.last_name} (${r.role})`));
  
  const hrodiUids = hrodiResult.rows.map(r => r.uid);
  console.log('\nHRODI UIDs:', hrodiUids);
  
  // 2. Check if engineer_form has an updated_by or uid field to link back
  const colResult = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'engineer_form'
    ORDER BY ordinal_position
  `);
  console.log('\nAll engineer_form columns:');
  colResult.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type})`));
  
  await pool.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
