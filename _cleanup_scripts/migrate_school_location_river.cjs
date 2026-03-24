require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  console.log("Starting migration: Add river_crossing_on_foot and river_crossing_count to school_location_profiles...");
  try {
    await pool.query(`
      ALTER TABLE school_location_profiles 
      ADD COLUMN IF NOT EXISTS river_crossing_on_foot BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS river_crossing_count INTEGER DEFAULT 0;
    `);
    console.log("✅ Migration successful: River crossing columns added.");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    await pool.end();
  }
}

migrate();
