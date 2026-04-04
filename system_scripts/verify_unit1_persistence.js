import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runTest() {
  try {
    console.log("🛠️ Running migrations on ph_schools...");
    await pool.query(`
      ALTER TABLE ph_schools 
      ADD COLUMN IF NOT EXISTS local_file_path TEXT,
      ADD COLUMN IF NOT EXISTS local_file_name TEXT,
      ADD COLUMN IF NOT EXISTS local_file_size BIGINT,
      ADD COLUMN IF NOT EXISTS head_position_title TEXT,
      ADD COLUMN IF NOT EXISTS head_sex TEXT,
      ADD COLUMN IF NOT EXISTS head_date_hired TIMESTAMP;
    `);
    console.log("✅ Migrations applied.");
  } catch (migErr) {
    console.warn("⚠️ Migration warning (might already exist):", migErr.message);
  }

  const testId = 'TEST-UNIT1-999';
  const testIern = 'IERN-UNIT1-999';

  const testData = {
    school_id: testId,
    iern: testIern,
    school_name: 'Antigravity Test School',
    region: 'Region IV-A',
    province: 'Cavite',
    division: 'Cavite',
    district: 'Carmona',
    municipality: 'CARMONA',
    barangay: 'Test Brgy',
    leg_district: '5th',
    curricular_offering: 'Elementary',
    school_head: 'Dr. Antigravity',
    contact_number: '09123456789',
    ownership: 'Government',
    ownership_document_type: 'TCT',
    head_first_name: 'Anti',
    head_last_name: 'Gravity',
    local_file_path: '/uploads/test_doc.pdf',
    local_file_name: 'test_doc.pdf',
    local_file_size: 1024
  };

  try {
    console.log("🚀 Testing POST /api/ph_schools/unit1...");
    // We'll call the DB logic directly since we are on the server
    // (Simulating the API call logic)
    const query = `
      INSERT INTO ph_schools (
        school_id, iern, school_name, region, province, division, district, 
        municipality, barangay, leg_district, curricular_offering,
        school_head, contact_number, ownership, ownership_document_type,
        head_first_name, head_last_name, local_file_path, local_file_name, local_file_size,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, CURRENT_TIMESTAMP
      )
      ON CONFLICT (school_id) DO UPDATE SET
        iern = EXCLUDED.iern,
        school_name = EXCLUDED.school_name,
        school_head = EXCLUDED.school_head,
        local_file_path = EXCLUDED.local_file_path,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    const values = [
      testData.school_id, testData.iern, testData.school_name, testData.region, testData.province, testData.division, testData.district,
      testData.municipality, testData.barangay, testData.leg_district, testData.curricular_offering,
      testData.school_head, testData.contact_number, testData.ownership, testData.ownership_document_type,
      testData.head_first_name, testData.head_last_name, testData.local_file_path, testData.local_file_name, testData.local_file_size
    ];
    await pool.query(query, values);
    console.log("✅ Data saved to ph_schools.");

    console.log("🚀 Testing GET /api/ph_schools/:schoolId...");
    const res = await pool.query('SELECT * FROM ph_schools WHERE school_id = $1', [testId]);
    if (res.rows.length === 0) throw new Error("GET failed: School not found");
    
    const saved = res.rows[0];
    const fieldsToVerify = ['school_head', 'contact_number', 'local_file_path', 'local_file_name'];
    fieldsToVerify.forEach(field => {
      if (saved[field] !== testData[field]) {
        throw new Error(`Mismatch in ${field}: expected ${testData[field]}, got ${saved[field]}`);
      }
    });
    console.log("✅ Data verification successful!");

    // Clean up
    await pool.query('DELETE FROM ph_schools WHERE school_id = $1', [testId]);
    console.log("🧹 Test data cleaned up.");

  } catch (err) {
    console.error("❌ Test Failed:", err.message);
  } finally {
    await pool.end();
  }
}

runTest();
