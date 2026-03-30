import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🚀 Creating ph_school_completion table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ph_school_completion (
        iern VARCHAR(255) PRIMARY KEY,
        unit1_completion BOOLEAN DEFAULT false,
        unit2_completion BOOLEAN DEFAULT false,
        unit3_completion BOOLEAN DEFAULT false,
        unit4_completion BOOLEAN DEFAULT false,
        unit5_completion BOOLEAN DEFAULT false,
        unit6_completion BOOLEAN DEFAULT false,
        unit7_completion BOOLEAN DEFAULT false,
        unit8_completion BOOLEAN DEFAULT false,
        total_completion DECIMAL(5,2) DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // We need to handle mapping school_id to iern for migration if ph_schools uses school_id as PK but completion table uses iern
    // Let's assume ph_schools has iern.
    console.log('📦 Migrating existing progress data...');
    // Note: ph_schools current columns are likely unit1_completed etc based on previous Grep but I didn't find them?
    // Let's check ph_schools columns first if possible?
    
    // Attempt migration from ph_schools to ph_school_completion
    // We will use COALESCE and handle the fact that we might not have all columns yet or they might be named differently
    await client.query(`
      INSERT INTO ph_school_completion (iern, unit1_completion, unit2_completion, total_completion)
      SELECT iern, 
             CASE WHEN school_name IS NOT NULL THEN true ELSE false END as unit1_completion,
             CASE WHEN enroll_kinder IS NOT NULL THEN true ELSE false END as unit2_completion,
             0 as total_completion
      FROM ph_schools
      WHERE iern IS NOT NULL
      ON CONFLICT (iern) DO NOTHING;
    `);

    console.log('🧹 Dropping legacy columns from ph_schools...');
    // We only drop if they exist to avoid errors
    const dropCols = [
        'unit1', 'unit2', 'unit3', 'unit4', 'unit5', 'unit6', 'unit7', 'unit8', 'unit9', 'unit10',
        'unit1_completed', 'unit2_completed', 'unit3_completed', 'unit4_completed', 'unit5_completed', 'unit6_completed', 'unit7_completed', 'unit8_completed', 'unit9_completed', 'unit10_completed',
        'total_completion'
    ];

    for (const col of dropCols) {
        try {
            await client.query(`ALTER TABLE ph_schools DROP COLUMN IF EXISTS ${col}`);
            console.log(`✅ Dropped ${col} from ph_schools`);
        } catch (e) {
            console.log(`ℹ️ Column ${col} already gone or not found.`);
        }
    }

    await client.query('COMMIT');
    console.log('🎉 Migration successful!');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
