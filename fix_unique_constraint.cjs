const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function fixUniqueConstraint() {
  console.log("🚀 Fixing Unique Constraint for school_location_profiles...");
  
  try {
    const client = await pool.connect();
    
    // Check for duplicates first to prevent migration failure
    const dupCheck = await client.query(`
      SELECT school_id, COUNT(*) 
      FROM school_location_profiles 
      GROUP BY school_id 
      HAVING COUNT(*) > 1
    `);
    
    if (dupCheck.rows.length > 0) {
      console.warn("⚠️ Duplicate school_id entries found! Cleaning up oldest duplicates...");
      for (const row of dupCheck.rows) {
        await client.query(`
          DELETE FROM school_location_profiles 
          WHERE school_id = $1 
          AND id NOT IN (
            SELECT id FROM school_location_profiles 
            WHERE school_id = $1 
            ORDER BY updated_at DESC 
            LIMIT 1
          )
        `, [row.school_id]);
      }
      console.log("✅ Duplicates cleaned.");
    }

    // Add unique constraint
    await client.query(`
      ALTER TABLE school_location_profiles 
      ADD CONSTRAINT unique_school_id UNIQUE (school_id);
    `);
    
    console.log("✅ Unique constraint added to 'school_id' successfully!");
    client.release();
  } catch (err) {
    if (err.message.includes("already exists")) {
      console.log("ℹ️ Unique constraint already exists.");
    } else {
      console.error("❌ Migration failed:", err.message);
    }
  } finally {
    await pool.end();
  }
}

fixUniqueConstraint();
