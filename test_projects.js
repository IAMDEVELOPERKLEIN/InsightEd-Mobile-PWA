
async function testProjects() {
  try {
    const start = Date.now();
    const res = await fetch('http://localhost:3000/api/projects');
    const duration = Date.now() - start;
    if (res.ok) {
      const data = await res.json();
      console.log(`Projects response (${duration}ms): Found ${data.length} rows`);
    } else {
      console.log(`Projects FAILED (${duration}ms): Status ${res.status}`);
    }
  } catch (err) {
    console.error("Projects HANGS or FAILED:", err.message);
  }
}

testProjects();
