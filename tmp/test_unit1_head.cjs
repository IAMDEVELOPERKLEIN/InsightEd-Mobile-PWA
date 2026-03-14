const fetch = require('node-fetch');

async function testSave() {
    const data = {
        school_id: "999999",
        school_name: "Test School head",
        region: "Region I",
        province: "Ilocos Norte",
        municipality: "Adams",
        barangay: "Adams (Poblacion)",
        division: "Ilocos Norte",
        district: "Adams",
        leg_district: "1st District",
        curricular_offering: "Purely Elementary",
        head_first_name: "JUAN",
        head_middle_name: "DELA",
        head_last_name: "CRUZ",
        head_sex: "Male",
        head_position_title: "School Principal I",
        head_date_of_birth: "1980-01-01",
        head_date_hired: "2020-01-01",
        latitude: "18.45",
        longitude: "120.9"
    };

    console.log("Saving Unit 1 with head profile...");
    const res = await fetch('http://localhost:3000/api/ph_schools/unit1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (res.ok) {
        console.log("✅ Success:", await res.json());
    } else {
        console.error("❌ Failed:", res.status, await res.text());
    }
}

testSave();
