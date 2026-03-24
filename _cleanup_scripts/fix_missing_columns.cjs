const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function fixMissingColumns() {
  console.log("🚀 Starting Unified Schema Fix for school_location_profiles...");
  
  const queries = [
    // Geo v2
    `ALTER TABLE school_location_profiles ADD COLUMN IF NOT EXISTS road_cliff_pct INTEGER DEFAULT 0;`,
    `ALTER TABLE school_location_profiles ADD COLUMN IF NOT EXISTS near_water BOOLEAN DEFAULT FALSE;`,
    
    // Insurgency/Threats v2
    `ALTER TABLE school_location_profiles ADD COLUMN IF NOT EXISTS has_insurgency_threats BOOLEAN DEFAULT FALSE;`,
    
    // Passability
    `ALTER TABLE school_location_profiles ADD COLUMN IF NOT EXISTS road_passable_public_transpo_pct INTEGER DEFAULT 100;`,
    
    // River Crossing
    `ALTER TABLE school_location_profiles ADD COLUMN IF NOT EXISTS river_crossing_on_foot BOOLEAN DEFAULT FALSE;`,
    `ALTER TABLE school_location_profiles ADD COLUMN IF NOT EXISTS river_crossing_count INTEGER DEFAULT 0;`,
    
    // Proximity Metrics (KM)
    `ALTER TABLE school_location_profiles ADD COLUMN IF NOT EXISTS proximity_hospital_km NUMERIC;`,
    `ALTER TABLE school_location_profiles ADD COLUMN IF NOT EXISTS proximity_brgy_hall_km NUMERIC;`,
    `ALTER TABLE school_location_profiles ADD COLUMN IF NOT EXISTS proximity_muni_hall_km NUMERIC;`,
    `ALTER TABLE school_location_profiles ADD COLUMN IF NOT EXISTS proximity_sdo_km NUMERIC;`,
    `ALTER TABLE school_location_profiles ADD COLUMN IF NOT EXISTS proximity_clinic_km NUMERIC;`,
    `ALTER TABLE school_location_profiles ADD COLUMN IF NOT EXISTS proximity_terminal_km NUMERIC;`,
    `ALTER TABLE school_location_profiles ADD COLUMN IF NOT EXISTS proximity_highway_km NUMERIC;`,
    
    // Proximity Metrics (Minutes)
    `ALTER TABLE school_location_profiles ADD COLUMN IF NOT EXISTS proximity_brgy_hall_mins INTEGER;`,
    `ALTER TABLE school_location_profiles ADD COLUMN IF NOT EXISTS proximity_muni_hall_mins INTEGER;`,
    `ALTER TABLE school_location_profiles ADD COLUMN IF NOT EXISTS proximity_sdo_mins INTEGER;`,
    `ALTER TABLE school_location_profiles ADD COLUMN IF NOT EXISTS proximity_clinic_mins INTEGER;`,
    `ALTER TABLE school_location_profiles ADD COLUMN IF NOT EXISTS proximity_terminal_mins INTEGER;`,
    `ALTER TABLE school_location_profiles ADD COLUMN IF NOT EXISTS proximity_highway_mins INTEGER;`,
    
    // Anthropogenic Threats
    `ALTER TABLE school_location_profiles ADD COLUMN IF NOT EXISTS anthropogenic_threats JSONB DEFAULT '[]'::jsonb;`
  ];

  try {
    const client = await pool.connect();
    for (const query of queries) {
      try {
        await client.query(query);
        console.log(`✅ Executed: ${query.split('ADD COLUMN')[1] || query}`);
      } catch (err) {
        console.warn(`⚠️ Warning for query [${query}]: ${err.message}`);
      }
    }
    client.release();
    console.log("🎉 All missing columns ensured successfully!");
  } catch (err) {
    console.error("❌ Critical migration failure:", err.message);
  } finally {
    await pool.end();
  }
}

fixMissingColumns();
