import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createPhSchoolsTable() {
  const client = await pool.connect();
  try {
    console.log("⏳ Creating complete ph_schools table with IERN...");
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS ph_schools (
          -- ==========================================
          -- UNIT 1: SCHOOL IDENTITY
          -- ==========================================
          school_id VARCHAR(255) PRIMARY KEY,
          iern VARCHAR(50) UNIQUE,  -- NEW: Assigned IERN from your CSV
          school_name VARCHAR(255),
          region VARCHAR(100),
          division VARCHAR(100),
          district VARCHAR(100),
          curricular_offering VARCHAR(255),
          school_classification VARCHAR(100),
          
          -- ==========================================
          -- UNIT 2: THE LEARNERS
          -- ==========================================
          -- Step 1: Base Enrollment 
          enroll_kinder INTEGER DEFAULT 0, enroll_g1 INTEGER DEFAULT 0, enroll_g2 INTEGER DEFAULT 0,
          enroll_g3 INTEGER DEFAULT 0, enroll_g4 INTEGER DEFAULT 0, enroll_g5 INTEGER DEFAULT 0,
          enroll_g6 INTEGER DEFAULT 0, total_enrollment INTEGER DEFAULT 0,

          -- Step 2: Special Categories
          sned_learners INTEGER DEFAULT 0,
          non_graded_learners INTEGER DEFAULT 0,

          -- Step 3: ARAL Learners (Grades 1-6)
          aral_math_g1 INTEGER DEFAULT 0, aral_math_g2 INTEGER DEFAULT 0, aral_math_g3 INTEGER DEFAULT 0, 
          aral_math_g4 INTEGER DEFAULT 0, aral_math_g5 INTEGER DEFAULT 0, aral_math_g6 INTEGER DEFAULT 0,
          
          aral_read_g1 INTEGER DEFAULT 0, aral_read_g2 INTEGER DEFAULT 0, aral_read_g3 INTEGER DEFAULT 0, 
          aral_read_g4 INTEGER DEFAULT 0, aral_read_g5 INTEGER DEFAULT 0, aral_read_g6 INTEGER DEFAULT 0,

          aral_sci_g1 INTEGER DEFAULT 0, aral_sci_g2 INTEGER DEFAULT 0, aral_sci_g3 INTEGER DEFAULT 0, 
          aral_sci_g4 INTEGER DEFAULT 0, aral_sci_g5 INTEGER DEFAULT 0, aral_sci_g6 INTEGER DEFAULT 0,

          -- Step 4: The "Magic Math" Gender Breakdown
          male_enrollment INTEGER DEFAULT 0,
          female_enrollment INTEGER DEFAULT 0,

          -- Metadata
          verified_as_of DATE,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log("✅ Successfully created 'ph_schools' table with IERN and Unit 2 fields!");
  } catch (err) {
    console.error("❌ Error creating table:", err);
  } finally {
    client.release();
    pool.end();
  }
}

createPhSchoolsTable();