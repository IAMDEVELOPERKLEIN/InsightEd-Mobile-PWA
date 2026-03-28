const fetch = require('node-fetch');

async function testSummary() {
    try {
        console.log("Testing /api/dashboard/efd-summary...");
        const res = await fetch('http://localhost:3000/api/dashboard/efd-summary?engineer_id=test_engineer');
        if (!res.ok) {
            console.error("Endpoint failed with status:", res.status);
            return;
        }
        const data = await res.json();
        console.log("Summary Data received:", JSON.stringify(data, null, 2).substring(0, 500) + "...");
        console.log("Total Projects:", data.totalStats?.totalProjects);
        
        console.log("\nTesting /api/projects with pagination...");
        const pRes = await fetch('http://localhost:3000/api/projects?page=1&limit=5');
        const pData = await pRes.json();
        console.log("Pagination metadata:", pData.pagination);
        console.log("Projects received:", pData.data?.length);
    } catch (err) {
        console.error("Test error:", err.message);
    }
}

testSummary();
