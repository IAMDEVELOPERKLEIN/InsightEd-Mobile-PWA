const pg = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function reconstructTable() {
  const client = await pool.connect();
  try {
    console.log('--- Table Reconstruction: engineer_form ---');
    
    // 1. Double check current physical count
    const physRes = await client.query(`
      SELECT count(*) as total_physical_attributes
      FROM pg_attribute 
      WHERE attrelid = 'engineer_form'::regclass 
      AND attnum > 0;
    `);
    console.log(`Current Physical Attributes: ${physRes.rows[0].total_physical_attributes}`);

    console.log('\nSTEP 1: Checking initial record count...');
    const countRes = await client.query('SELECT count(*) as count FROM engineer_form');
    const initialCount = parseInt(countRes.rows[0].count);
    console.log(`Initial record count: ${initialCount}`);

    console.log('\nSTEP 2: Creating engineer_form_v2 (Clean copy with same PostgreSQL types)...');
    // CREATE TABLE AS SELECT preserves all data types and data
    await client.query('CREATE TABLE engineer_form_v2 AS SELECT * FROM engineer_form');
    
    console.log('\nSTEP 3: Verifying cross-load integrity...');
    const newCountRes = await client.query('SELECT count(*) as count FROM engineer_form_v2');
    const newCount = parseInt(newCountRes.rows[0].count);
    console.log(`New record count:     ${newCount}`);

    if (initialCount !== newCount) {
        throw new Error(`DATA LOSS DETECTED! Initial: ${initialCount}, New: ${newCount}. Aborting.`);
    }
    console.log('âœ… Record count verified. No data lost.');

    console.log('\nSTEP 4: Restoring Primary Key and Sequences...');
    await client.query('ALTER TABLE engineer_form_v2 ADD PRIMARY KEY (project_id)');
    // Restore sequence to match current project_id max
    await client.query("SELECT setval(pg_get_serial_sequence('engineer_form', 'project_id'), (SELECT MAX(project_id) FROM engineer_form_v2))").catch(() => {
        console.log('Note: Serial sequence adjustment skipped or not required.');
    });

    console.log('\nSTEP 5: Final Atomic Swap (Rename)...');
    await client.query('BEGIN');
    
    // Safety Net: Keep the old table with a timestamp
    const timestamp = Math.floor(Date.now() / 1000);
    const legacyName = `engineer_form_legacy_${timestamp}`;
    await client.query(`ALTER TABLE engineer_form RENAME TO ${legacyName}`);
    
    // Swap in the clean table
    await client.query('ALTER TABLE engineer_form_v2 RENAME TO engineer_form');
    
    await client.query('COMMIT');
    
    console.log(`\nâœ… SUCCESS: engineer_form has been reconstructed.`);
    console.log(`âœ… Legacy table preserved as: ${legacyName}`);
    
    // 4. Verification
    const newPhysRes = await client.query(`
      SELECT count(*) as total_physical_attributes
      FROM pg_attribute 
      WHERE attrelid = 'engineer_form'::regclass 
      AND attnum > 0;
    `);
    console.log(`New Physical Attributes: ${newPhysRes.rows[0].total_physical_attributes} (Slots reclaimed!)`);

    client.release();
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('â Œ Reconstruction Failed:', err.message);
    if (err.message.includes('already exists')) {
        console.log('Suggestion: DROP TABLE engineer_form_v2; and try again.');
    }
    client.release();
    process.exit(1);
  }
}

reconstructTable();
