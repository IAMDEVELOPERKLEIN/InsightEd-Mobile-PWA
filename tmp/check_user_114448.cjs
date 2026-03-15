const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkUser() {
    try {
        const res = await pool.query("SELECT email, email_address, passcode, school_id, registrant_type FROM users WHERE school_id = '114448' OR email = '114448' OR email_address = '114448'");
        console.log("User 114448 Data:", JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkUser();
