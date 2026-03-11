import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function verifyDb() {
    const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const testBug = {
            description: "Direct DB verification bug report " + Date.now(),
            metadata: JSON.stringify({ source: 'verification_script', timestamp: new Date().toISOString() })
        };

        console.log("🐞 Inserting test bug directly into DB...");
        await pool.query(
            'INSERT INTO app_bugs (description, metadata) VALUES ($1, $2)',
            [testBug.description, testBug.metadata]
        );

        console.log("🔍 Verifying insertion...");
        const res = await pool.query(
            'SELECT * FROM app_bugs WHERE description = $1',
            [testBug.description]
        );

        if (res.rows.length > 0) {
            console.log("✅ Bug report stored successfully in database!");
            console.log("DB Entry:", res.rows[0]);
        } else {
            console.error("❌ Bug report NOT found in database.");
        }

    } catch (err) {
        console.error("❌ DB Verification failed:", err.message);
    } finally {
        await pool.end();
    }
}

verifyDb();
