import pg from 'pg';
import fs from 'fs';

// Custom ENV parser for UTF-16LE .env compatibility
let envContent;
try {
    envContent = fs.readFileSync('.env', 'utf16le');
} catch (e) {
    envContent = fs.readFileSync('.env', 'utf8');
}
let match = envContent.match(/DATABASE_URL=(.+)/);
if (!match) {
    envContent = fs.readFileSync('.env', 'utf8');
    match = envContent.match(/DATABASE_URL=(.+)/);
}
const dbUrl = match[1].trim().replace(/^['"]|['"]$/g, '');

const { Pool } = pg;
const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function addUnit6Columns() {
  const client = await pool.connect();
  try {
    console.log("⏳ Adding Unit 6 (Physical Facilities) columns to ph_schools...");
    
    await client.query(`
      ALTER TABLE ph_schools 
      -- Chapter 1: Utilities
      ADD COLUMN IF NOT EXISTS has_electricity BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS has_internet BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS water_source VARCHAR(100),
      
      -- Chapter 2: Classrooms (Magic Math)
      ADD COLUMN IF NOT EXISTS classrooms_total INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS classrooms_good INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS classrooms_repair INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS classrooms_condemned INTEGER DEFAULT 0,

      -- Chapter 3: WASH (Water, Sanitation, Hygiene)
      ADD COLUMN IF NOT EXISTS toilets_male INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS toilets_female INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS toilets_pwd INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS handwashing_stations INTEGER DEFAULT 0;
    `);
    
    console.log("✅ Successfully added Unit 6 Facilities columns!");
  } catch (err) {
    console.error("❌ Error updating table:", err);
  } finally {
    client.release();
    pool.end();
  }
}

addUnit6Columns();
