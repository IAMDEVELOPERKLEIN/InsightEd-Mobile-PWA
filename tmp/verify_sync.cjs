const fetch = require('node-fetch');

async function testSync() {
  const schoolId = '113508'; // Example school ID
  const testData = {
    school_id: schoolId,
    school_name: 'MALIGA ELEMENTARY SCHOOL (TEST)',
    region: 'REGION I',
    province: 'PANGASINAN',
    municipality: 'MALASIQUI',
    barangay: 'MALIGA',
    division: 'PANGASINAN I',
    district: 'MALASIQUI II',
    leg_district: '3rd District',
    curricular_offering: 'Purely Elementary',
    latitude: '15.9189',
    longitude: '120.4132',
    iern: 'IE-113508',
    school_head: 'John Doe',
    contact_number: '09123456789',
    google_drive_link: 'https://drive.google.com/file/d/1Bxd-o-l_U9_u_x_z_X/view',
    google_drive_file_id: '1Bxd-o-l_U9_u_x_z_X',
    google_drive_file_name: 'Test File.pdf',
    google_drive_thumbnail_url: 'https://drive.google.com/thumbnail?id=1Bxd-o-l_U9_u_x_z_X',
    school_type: 'without_annex',
    ownership_document_type: 'Tax Declaration',
    established_month: 'January',
    established_year: 1950,
    head_first_name: 'John',
    head_middle_name: 'Smith',
    head_last_name: 'Doe',
    head_sex: 'Male',
    head_position_title: 'Principal I',
    head_date_of_birth: '1970-01-01',
    head_date_hired: '2010-06-01'
  };

  console.log('Testing sync for school:', schoolId);

  try {
    const response = await fetch('http://localhost:3000/api/ph_schools/unit1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });

    if (response.ok) {
      console.log('✅ Sync request successful.');
      
      // Now verify in the DB if possible, or just check the GET endpoint
      const getResponse = await fetch(`http://localhost:3000/api/ph_schools/${schoolId}`);
      const getData = await getResponse.json();
      
      if (getData.exists) {
        console.log('✅ Data retrieved from GET endpoint.');
        const savedData = getData.data;
        
        const fieldsToCheck = [
          'head_first_name', 'head_last_name', 'head_date_of_birth', 
          'established_year', 'google_drive_file_id'
        ];
        
        let allPassed = true;
        for (const field of fieldsToCheck) {
          if (savedData[field] == testData[field] || (field.includes('date') && savedData[field].startsWith(testData[field]))) {
            console.log(`  - ${field}: Match! (${savedData[field]})`);
          } else {
            console.error(`  - ${field}: MISMATCH! Expected ${testData[field]}, got ${savedData[field]}`);
            allPassed = false;
          }
        }
        
        if (allPassed) {
          console.log('🏆 All fields verified successfully!');
        } else {
          console.error('❌ Some fields failed verification.');
        }
      } else {
        console.error('❌ Could not retrieve saved data from GET endpoint.');
      }
    } else {
      console.error('❌ Sync request failed:', response.status, await response.text());
    }
  } catch (err) {
    console.error('❌ Test failed with error:', err.message);
    console.log('Note: This test requires the server to be running on http://localhost:3000');
  }
}

testSync();
