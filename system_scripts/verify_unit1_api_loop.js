import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

// Using fetch to test the actual API endpoints on the root server (Port 3000)
// turbo-dev.sh starts api/index.js on port 3000

async function runApiTest() {
  const baseUrl = 'http://localhost:3000';
  const schoolId = '107898'; // Milagrosa ES
  const iern = '2026-17597';

  const testPayload = {
    school_id: schoolId,
    iern: iern,
    school_name: 'Milagrosa Elementary School (API Test)',
    region: 'Region IV-A',
    province: 'Cavite',
    division: 'Cavite',
    district: 'Carmona',
    municipality: 'CARMONA',
    barangay: 'Milagrosa',
    leg_district: '5th',
    curricular_offering: 'Elementary',
    school_head: 'Test Head',
    contact_number: '09000000000',
    local_file_path: '/uploads/api_test.pdf',
    local_file_name: 'api_test.pdf',
    local_file_size: 5000,
    google_drive_link: 'https://drive.google.com/test'
  };

  try {
    console.log("🚀 Testing POST /api/ph_schools/unit1...");
    const postRes = await fetch(`${baseUrl}/api/ph_schools/unit1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });
    const postData = await postRes.json();
    if (!postRes.ok) throw new Error(`POST failed: ${postData.error || postRes.statusText}`);
    console.log("✅ POST successful:", postData.message);

    console.log("🚀 Testing GET /api/ph_schools/:schoolId...");
    const getRes = await fetch(`${baseUrl}/api/ph_schools/${schoolId}`);
    const getData = await getRes.json();
    if (!getRes.ok) throw new Error(`GET failed: ${getRes.statusText}`);
    
    if (!getData.exists) throw new Error("GET reported school does not exist");
    
    const saved = getData.data;
    console.log("📊 Verification Data Received:", {
      school_head: saved.school_head,
      local_file_path: saved.local_file_path,
      ownership_document_path: saved.ownership_document_path
    });

    if (saved.school_head !== testPayload.school_head) throw new Error(`Mismatch in school_head: ${saved.school_head}`);
    if (saved.local_file_path !== testPayload.local_file_path) throw new Error(`Mismatch in local_file_path: ${saved.local_file_path}`);
    
    console.log("✅ API loop verification successful!");

  } catch (err) {
    console.error("❌ API Test Failed:", err.message);
  }
}

runApiTest();
