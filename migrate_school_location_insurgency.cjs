require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  console.log("Starting migration: Add has_insurgency_threats to school_location_profiles...");
  try {
    await pool.query(`
      ALTER TABLE school_location_profiles 
      ADD COLUMN IF NOT EXISTS has_insurgency_threats BOOLEAN DEFAULT FALSE;
    `);
    console.log("✅ Migration successful: has_insurgency_threats column added.");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    await pool.end();
  }
}

migrate();
