const pg = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkNullEmails() {
    try {
        const res = await pool.query("SELECT COUNT(*) FROM users WHERE email IS NULL");
        console.log(`📊 Users with NULL email: ${res.rows[0].count}`);
        
        const res2 = await pool.query("SELECT school_id, role, email FROM users WHERE school_id = '113508'");
        console.log(`🔍 Test user 113508 details:`, res2.rows[0]);
    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        await pool.end();
    }
}

checkNullEmails();
