const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function dropHeadSex() {
    const client = await pool.connect();
    try {
        console.log("🚀 Dropping head_sex column...");

        console.log("1️⃣ Dropping from school_profiles...");
        await client.query('ALTER TABLE school_profiles DROP COLUMN IF EXISTS head_sex');

        console.log("2️⃣ Dropping from form_school_head...");
        await client.query('ALTER TABLE form_school_head DROP COLUMN IF EXISTS head_sex');

        console.log("✅ Columns dropped.");
    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

dropHeadSex();
