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

async function addUnit5Columns() {
  const client = await pool.connect();
  try {
    console.log("⏳ Adding Unit 5 (Shifting & Modality) columns to ph_schools...");
    
    // The "Standard Setup" Gatekeeper
    await client.query(`ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS has_standard_shifting BOOLEAN DEFAULT FALSE;`);

    // Grade-level shifting and modes (Kinder to Grade 12)
    const levels = ["k", "g1", "g2", "g3", "g4", "g5", "g6", "g7", "g8", "g9", "g10", "g11", "g12"];
    
    for (const lvl of levels) {
      await client.query(`
        ALTER TABLE ph_schools 
        ADD COLUMN IF NOT EXISTS shift_${lvl} VARCHAR(50),
        ADD COLUMN IF NOT EXISTS mode_${lvl} VARCHAR(50);
      `);
    }

    // Emergency ADMs
    await client.query(`
      ALTER TABLE ph_schools 
      ADD COLUMN IF NOT EXISTS adm_mdl BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS adm_odl BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS adm_tvi BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS adm_blended BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS adm_others VARCHAR(255);
    `);
    
    console.log("✅ Successfully added Unit 5 Shifting & Modality columns!");
  } catch (err) {
    console.error("❌ Error updating table:", err);
  } finally {
    client.release();
    pool.end();
  }
}

addUnit5Columns();
