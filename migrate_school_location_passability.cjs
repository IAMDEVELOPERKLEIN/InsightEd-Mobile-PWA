require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  console.log("Starting migration: Add road_passable_public_transpo_pct to school_location_profiles...");
  try {
    await pool.query(`
      ALTER TABLE school_location_profiles 
      ADD COLUMN IF NOT EXISTS road_passable_public_transpo_pct INTEGER DEFAULT 100;
    `);
    console.log("✅ Migration successful: road_passable_public_transpo_pct column added.");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    await pool.end();
  }
}

migrate();
