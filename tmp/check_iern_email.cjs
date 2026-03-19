const pg = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkIern() {
    try {
        const res = await pool.query('SELECT "Email Address" FROM "schools_IERN" WHERE "School ID" = $1', ['113508']);
        console.log(`🔍 Email in schools_IERN for 113508:`, res.rows[0]);
    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        await pool.end();
    }
}

checkIern();
