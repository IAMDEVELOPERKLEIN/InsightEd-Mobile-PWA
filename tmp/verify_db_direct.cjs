const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd',
  ssl: { rejectUnauthorized: false }
});

async function verifyDb() {
  const schoolId = '113508'; // Example school ID
  try {
    await client.connect();
    console.log('Connected to DB for verification.');

    // 1. Check if columns exist
    const schemaRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ph_schools' 
      AND column_name IN ('head_date_of_birth', 'head_date_hired', 'established_year', 'google_drive_link', 'google_drive_file_id');
    `);
    console.log('Columns found:', schemaRes.rows.map(r => `${r.column_name} (${r.data_type})`));

    // 2. Test INSERT/UPDATE on these columns
    const testBirthDate = '1985-05-20';
    const testEstablishedYear = 1968;
    const testGDriveId = 'VERIFY_1234567890';

    console.log(`Testing UPDATE for school_id: ${schoolId}`);
    await client.query(`
      UPDATE ph_schools 
      SET head_date_of_birth = $1, 
          established_year = $2,
          google_drive_file_id = $3
      WHERE school_id = $4
    `, [testBirthDate, testEstablishedYear, testGDriveId, schoolId]);

    // 3. Verify data was saved
    const verifyRes = await client.query(`
      SELECT head_date_of_birth, established_year, google_drive_file_id 
      FROM ph_schools 
      WHERE school_id = $1
    `, [schoolId]);

    const saved = verifyRes.rows[0];
    if (saved) {
      console.log('✅ Verification successful:');
      console.log(`  - head_date_of_birth: ${saved.head_date_of_birth.toISOString().split('T')[0]} (Expected: ${testBirthDate})`);
      console.log(`  - established_year: ${saved.established_year} (Expected: ${testEstablishedYear})`);
      console.log(`  - google_drive_file_id: ${saved.google_drive_file_id} (Expected: ${testGDriveId})`);
    } else {
      console.error('❌ Verification failed: School not found or data not saved.');
    }

  } catch (err) {
    console.error('❌ Database verification failed:', err);
  } finally {
    await client.end();
  }
}

verifyDb();
