import pg from 'pg';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '.env' });

async function testBugReport() {
    const testBug = {
        description: "Test bug report from verification script " + Date.now(),
        user_email: "test@example.com",
        user_uid: "test-uid-123"
    };

    console.log("🐞 Submitting test bug report...");
    
    try {
        const response = await fetch('http://localhost:3000/api/bugs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testBug)
        });

        const data = await response.json();
        console.log("Response Status:", response.status);
        console.log("Response Data:", data);

        if (response.ok && data.message === "Developers are on their way to fix this") {
            console.log("✅ Bug report API functional!");
        } else {
            console.error("❌ Bug report API failed.");
            return;
        }

        // Verify in DB
        const pool = new pg.Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });

        console.log("\n📋 Checking app_bugs table...");
        const res = await pool.query(
            'SELECT * FROM app_bugs WHERE description = $1',
            [testBug.description]
        );

        if (res.rows.length > 0) {
            console.log("✅ Bug report found in database!");
            console.log("DB Entry:", res.rows[0]);
        } else {
            console.error("❌ Bug report NOT found in database.");
        }

        await pool.end();

    } catch (err) {
        console.error("❌ Test failed:", err.message);
    }
}

testBugReport();
