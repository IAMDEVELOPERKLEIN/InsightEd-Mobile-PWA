
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🚀 Starting User Schema Migration...');
    await client.query('BEGIN');

    // 1. Add new columns if they don't exist
    console.log('📝 Adding columns: registrant_type, school_id, email_address...');
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS registrant_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS school_id VARCHAR(50),
      ADD COLUMN IF NOT EXISTS email_address VARCHAR(255)
    `);

    // 2. Data Migration: Lift numeric IDs from last_name to school_id
    // and identify those as 'School Head'
    console.log('🚚 Migrating School IDs from last_name column...');
    const migrateResult = await client.query(`
      UPDATE users 
      SET 
        school_id = last_name, 
        registrant_type = 'School Head'
      WHERE 
        last_name ~ '^[0-9]+$' 
        AND (school_id IS NULL OR school_id = '')
      RETURNING uid, email, last_name, school_id
    `);
    
    console.log(`✅ Migrated ${migrateResult.rowCount} users.`);

    // 3. For existing users with email but no email_address, populate email_address
    console.log('📧 Syncing email_address for non-school-head users...');
    const emailSyncResult = await client.query(`
      UPDATE users 
      SET email_address = email 
      WHERE (email_address IS NULL OR email_address = '') 
      AND email IS NOT NULL
    `);
    console.log(`✅ Synced ${emailSyncResult.rowCount} emails.`);

    await client.query('COMMIT');
    console.log('🏁 Migration Complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration Failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
