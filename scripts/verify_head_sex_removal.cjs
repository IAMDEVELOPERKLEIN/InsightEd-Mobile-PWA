const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkHeadSex() {
    const client = await pool.connect();
    try {
        console.log("🔍 Checking for head_sex column...");

        const res1 = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'school_profiles' AND column_name = 'head_sex';
        `);
        console.log(`school_profiles has head_sex: ${res1.rowCount > 0}`);

        const res2 = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'form_school_head' AND column_name = 'head_sex';
        `);
        console.log(`form_school_head has head_sex: ${res2.rowCount > 0}`);

    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

checkHeadSex();
