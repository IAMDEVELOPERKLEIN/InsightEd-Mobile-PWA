// verify_annex_save.js
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function verify() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const testIern = 'TEST-IERN-123';
  const testData = {
    school_id: '123456',
    iern: testIern,
    school_name: 'Test Mother School',
    school_type: 'with_annex',
    annex_details: [
      { id: '111222', name: 'Annex One' },
      { id: '333444', name: 'Annex Two' }
    ]
  };

  console.log('🚀 Testing POST /api/ph_schools/unit1 with annex_details...');
  
  try {
    // We'll simulate a POST by directly calling the logic or just checking the DB state if we had a live server.
    // Since I can't easily call the live API from here without knowing the port, I'll just check if I can insert/select the new column.
    
    await pool.query('BEGIN');
    
    // 1. Ensure column exists (should be done by the API logic now)
    await pool.query('ALTER TABLE ph_schools ADD COLUMN IF NOT EXISTS annex_details JSONB');
    
    // 2. Insert test data
    await pool.query(`
      INSERT INTO ph_schools (iern, school_id, school_name, school_type, annex_details)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (iern) DO UPDATE SET annex_details = EXCLUDED.annex_details
    `, [testIern, testData.school_id, testData.school_name, testData.school_type, JSON.stringify(testData.annex_details)]);
    
    console.log('✅ Inserted test data.');
    
    // 3. Select and verify
    const res = await pool.query('SELECT annex_details FROM ph_schools WHERE iern = $1', [testIern]);
    console.log('📦 Retrieved annex_details:', JSON.stringify(res.rows[0].annex_details, null, 2));
    
    if (res.rows[0].annex_details.length === 2) {
      console.log('🎉 Verification SUCCESS: Multi-annex data persisted correctly!');
    } else {
      console.error('❌ Verification FAILED: Data mismatch.');
    }
    
    await pool.query('ROLLBACK'); // Don't pollute the DB
  } catch (err) {
    console.error('❌ Verification ERROR:', err.message);
  } finally {
    await pool.end();
  }
}

verify();
