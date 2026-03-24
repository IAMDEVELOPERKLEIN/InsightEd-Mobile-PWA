const pg = require('pg');
require('dotenv').config();

async function checkData() {
    const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Checking Region and Division variations in engineer_form...');
        const res = await pool.query('SELECT DISTINCT region, division FROM engineer_form');
        console.table(res.rows);

        console.log('\nChecking Region III specifically...');
        const reg3 = await pool.query("SELECT DISTINCT region FROM engineer_form WHERE region ILIKE '%Region III%' OR region = '3' OR region ILIKE '%III%'");
        console.table(reg3.rows);

        console.log('\nChecking Bataan projects...');
        const bataan = await pool.query("SELECT project_id, project_name, region, division, is_donated FROM engineer_form WHERE division ILIKE '%Bataan%'");
        console.table(bataan.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkData();
