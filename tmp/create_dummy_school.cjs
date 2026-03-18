const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log("🚀 Starting database seeding for dummy school 999990...");

    // 1. Insert/Update ph_schools
    const schoolQuery = `
      INSERT INTO ph_schools (
        school_id, school_name, region, division, district, 
        curricular_offering, school_classification, school_type,
        total_enrollment, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()
      )
      ON CONFLICT (school_id) DO UPDATE SET
        school_name = EXCLUDED.school_name,
        region = EXCLUDED.region,
        division = EXCLUDED.division,
        updated_at = NOW();
    `;
    const schoolValues = [
      '999990', 'Generic Test School', 'Region III', 'Bataan', 'Generic District',
      'Elementary', 'Generic', 'Public',
      500
    ];
    await client.query(schoolQuery, schoolValues);
    console.log("✅ School 999990 inserted/updated in ph_schools.");

    // 2. Insert/Update users
    // password_hash for 'sebtest' is $2b$10$Vwp/uN2CnwVOkcCe7YY7GuSIb/mXVyO86TNF4XJTXVlC5aSIC87ei
    const userQuery = `
      INSERT INTO users (
        uid, school_id, role, password_hash, hash_version, passcode, 
        first_name, last_name, created_at, disabled
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, NOW(), false
      )
      ON CONFLICT (uid) DO UPDATE SET
        school_id = EXCLUDED.school_id,
        role = EXCLUDED.role,
        password_hash = EXCLUDED.password_hash,
        passcode = EXCLUDED.passcode,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name;
    `;
    const userValues = [
      'dummy-sh-999990', '999990', 'School Head', 
      '$2b$10$Vwp/uN2CnwVOkcCe7YY7GuSIb/mXVyO86TNF4XJTXVlC5aSIC87ei', 
      'bcrypt', '123456', 
      'Seb', 'Test'
    ];
    await client.query(userQuery, userValues);
    console.log("✅ User dummy-sh-999990 inserted/updated in users.");

    console.log("🎉 Seeding completed successfully!");
  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
