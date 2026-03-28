async function testPut() {
  const body = JSON.stringify({
    uid: "test-uid",
    procurement_status: "Under procurement",
    statusDesignPhase: "Under procurement"
  });

  try {
    const res = await fetch("http://localhost:3000/api/update-project/100033", {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: body
    });
    const data = await res.json();
    console.log("RESPONSE:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("FETCH ERROR:", err.message);
  }
}

testPut();
