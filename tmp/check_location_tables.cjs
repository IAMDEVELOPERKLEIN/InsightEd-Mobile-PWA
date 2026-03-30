
const pg = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function listLocationTables() {
    try {
        console.log('--- ph_barangays columns ---');
        const phCols = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'ph_barangays' 
            ORDER BY ordinal_position;
        `);
        console.log(phCols.rows.map(r => r.column_name));

        console.log('\n--- all_locations columns ---');
        const allCols = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'all_locations' 
            ORDER BY ordinal_position;
        `);
        console.log(allCols.rows.map(r => r.column_name));

        console.log('\n--- Sampling ph_barangays ---');
        const phSample = await pool.query("SELECT * FROM ph_barangays LIMIT 1");
        console.log(phSample.rows[0]);

        console.log('\n--- Sampling all_locations ---');
        const allSample = await pool.query("SELECT * FROM all_locations LIMIT 1");
        console.log(allSample.rows[0]);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

listLocationTables();
