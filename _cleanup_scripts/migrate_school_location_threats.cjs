require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  console.log("Starting migration: Add anthropogenic_threats to school_location_profiles...");
  try {
    await pool.query(`
      ALTER TABLE school_location_profiles 
      ADD COLUMN IF NOT EXISTS anthropogenic_threats JSONB DEFAULT '[]'::jsonb;
    `);
    console.log("✅ Migration successful: anthropogenic_threats column added.");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    await pool.end();
  }
}

migrate();
