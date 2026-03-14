require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  console.log("Starting migration: Add proximity columns for key reference points...");
  try {
    await pool.query(`
      ALTER TABLE school_location_profiles 
      ADD COLUMN IF NOT EXISTS proximity_hospital_km FLOAT,
      ADD COLUMN IF NOT EXISTS proximity_brgy_hall_mins INTEGER,
      ADD COLUMN IF NOT EXISTS proximity_brgy_hall_km FLOAT,
      ADD COLUMN IF NOT EXISTS proximity_muni_hall_mins INTEGER,
      ADD COLUMN IF NOT EXISTS proximity_muni_hall_km FLOAT,
      ADD COLUMN IF NOT EXISTS proximity_sdo_mins INTEGER,
      ADD COLUMN IF NOT EXISTS proximity_sdo_km FLOAT,
      ADD COLUMN IF NOT EXISTS proximity_clinic_mins INTEGER,
      ADD COLUMN IF NOT EXISTS proximity_clinic_km FLOAT,
      ADD COLUMN IF NOT EXISTS proximity_terminal_mins INTEGER,
      ADD COLUMN IF NOT EXISTS proximity_terminal_km FLOAT,
      ADD COLUMN IF NOT EXISTS proximity_highway_mins INTEGER,
      ADD COLUMN IF NOT EXISTS proximity_highway_km FLOAT;
    `);
    console.log("✅ Migration successful: Proximity columns added.");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    await pool.end();
  }
}

migrate();
