async function test() {
  try {
    const payload = {
      first_name: "Verified",
      middle_name: "V",
      last_name: "Teacher",
      position: "Teacher III",
      specialization: "Mathematics",
      sex: "Female",
      experience_bracket: "11-15 years",
      funding_source: "DepEd Nationally Funded",
      role_designation: "Non-Advisory",
      monday_mins: 360,
      tuesday_mins: 360,
      wednesday_mins: 360,
      thursday_mins: 360,
      friday_mins: 360,
      workloads: [
        { grade_level: "Grade 7", subject_name: "Math", subject_code: "M7-1", duration_minutes: 60 },
        { grade_level: "Grade 7", subject_name: "Math", subject_code: "M7-2", duration_minutes: 60 }
      ]
    };
    
    console.log("Sending PUT request to http://localhost:3000/api/teachers/5...");
    const response = await fetch('http://localhost:3000/api/teachers/5', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    if (response.ok) {
      console.log("Success:", data);
      
      // Verify summary works too
      console.log("Fetching workload summary for school 301891...");
      const sumResponse = await fetch('http://localhost:3000/api/schools/301891/workload-summary');
      const sumData = await sumResponse.json();
      console.log("Summary Data:", JSON.stringify(sumData, null, 2));
    } else {
      console.error("Error Status:", response.status);
      console.error("Error Data:", JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error("Error Message:", err.message);
  }
}

test();
