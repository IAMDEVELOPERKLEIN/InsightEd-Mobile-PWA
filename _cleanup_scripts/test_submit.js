async function testSubmit() {
    const schoolId = '301891'; // Based on user's error log
    const payload = {
        inventory: [{ building_name: "Test Bldg", category: "Standard", year_completed: 2020, status: "Newly Built" }],
        repairs: [{ building_name: "Test Bldg", room_name: "Room 1", items: [{ item: "Roof", condition: "Major", recommend_action: "Replace" }] }],
        demolitions: [{ building_name: "Old Bldg", age: true }]
    };

    console.log(`Sending POST to http://localhost:3000/api/ph_schools/unit10/${schoolId}/master`);
    
    try {
        const res = await fetch(`http://localhost:3000/api/ph_schools/unit10/${schoolId}/master`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const text = await res.text();
        console.log(`Status: ${res.status}`);
        console.log(`Response: ${text}`);
    } catch (err) {
        console.error("Fetch failed:", err.message);
    }
}

testSubmit();
