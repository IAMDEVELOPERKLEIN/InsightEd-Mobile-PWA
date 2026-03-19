const pg = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkUser() {
    const schoolId = '113508';
    console.log(`🔍 Checking user with School ID: ${schoolId}`);
    try {
        const res = await pool.query("SELECT uid, email, school_id, passcode, role, hash_version FROM users WHERE school_id = $1", [schoolId]);
        if (res.rows.length === 0) {
            console.log("❌ User not found in 'users' table.");
        } else {
            console.log("✅ User found:");
            console.table(res.rows);
        }
    } catch (err) {
        console.error("❌ Error checking user:", err.message);
    } finally {
        await pool.end();
    }
}

checkUser();
