
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkIndices() {
  try {
    console.log("Checking indices for 'school_profiles' table...");
    const res = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'school_profiles'
    `);
    res.rows.forEach(row => console.log(` - Index: ${row.indexname}\n   Def: ${row.indexdef}`));

  } catch (err) {
    console.error("Error checking indices:", err);
  } finally {
    await pool.end();
  }
}

checkIndices();
