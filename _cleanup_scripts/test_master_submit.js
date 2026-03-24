const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testSubmit() {
    const schoolId = "300438"; // Example school ID
    const url = `http://localhost:5000/api/ph_schools/unit10/${schoolId}/master`;
    
    const payload = {
        inventory: [
            {
                building_name: "Test Bldg",
                category: "Academic Building",
                storey: 2,
                classroom: 4,
                room_length: 9,
                room_width: 7,
                year_completed: 2024,
                remarks: "Test remark",
                status: "Newly Built"
            }
        ],
        repairs: [
            {
                building_name: "Repair Bldg",
                room_name: "Room 101",
                items: [
                    {
                        item: "Roofing",
                        condition: "Repair",
                        damage_ratio: 25,
                        recommend_action: "Routine Repair",
                        demo_justification: "",
                        remarks: "Leaky"
                    }
                ]
            }
        ],
        demolitions: [
            {
                building_name: "Old Bldg",
                room_length: 10,
                room_width: 10,
                age: true,
                safety: false,
                calamity: false,
                upgrade: false
            }
        ]
    };

    try {
        console.log("Sending payload to", url);
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        console.log("Response:", data);
        if (!res.ok) {
            console.error("FAILED with status", res.status);
        }
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

testSubmit();
