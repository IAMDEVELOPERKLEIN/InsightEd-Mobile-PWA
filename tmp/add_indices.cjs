const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addIndices() {
  try {
    console.log("Adding btree indices to engineer_form...");
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ef_region ON engineer_form(region);
      CREATE INDEX IF NOT EXISTS idx_ef_division ON engineer_form(division);
      CREATE INDEX IF NOT EXISTS idx_ef_category ON engineer_form(project_category);
      CREATE INDEX IF NOT EXISTS idx_ef_funding_year ON engineer_form(funding_year);
      CREATE INDEX IF NOT EXISTS idx_ef_is_donated ON engineer_form(is_donated);
      CREATE INDEX IF NOT EXISTS idx_ef_program_type ON engineer_form(program_type);
    `);
    console.log("Indices added successfully.");
  } catch (err) {
    console.error("Error adding indices:", err);
  } finally {
    await pool.end();
  }
}

addIndices();
