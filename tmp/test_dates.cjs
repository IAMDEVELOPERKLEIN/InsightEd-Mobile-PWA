const fetch = require('node-fetch');

async function testDateRetrieval() {
    const schoolId = '113681'; // Or whatever test ID is used
    try {
        const res = await fetch(`http://localhost:3000/api/ph_schools/${schoolId}`);
        const result = await res.json();
        
        if (result.exists) {
            console.log("School Identity Found:");
            console.log("head_date_of_birth:", typeof result.data.head_date_of_birth, result.data.head_date_of_birth);
            console.log("head_date_hired:", typeof result.data.head_date_hired, result.data.head_date_hired);
        } else {
            console.log("School not found in ph_schools.");
        }
    } catch (err) {
        console.error("Fetch failed:", err.message);
    }
}

testDateRetrieval();
