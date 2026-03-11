
async function checkDbEndpoint() {
  try {
    const start = Date.now();
    // Using a random UID that likely won't exist but will trigger a DB query
    const res = await fetch('http://localhost:3000/api/user-info/test-uid-123');
    const duration = Date.now() - start;
    console.log(`DB Endpoint response (${duration}ms):`, res.status);
  } catch (err) {
    console.error("DB Endpoint HANGS or FAILED:", err.message);
  }
}

checkDbEndpoint();
