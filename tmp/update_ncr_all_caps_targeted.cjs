
const pg = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function updateNcrProvince() {
    try {
        console.log('--- Standardizing NCR Province to "METRO MANILA" ---');
        
        // 1. all_locations
        const resAll = await pool.query(`
            UPDATE all_locations 
            SET province = 'METRO MANILA' 
            WHERE region = 'NCR' OR region = 'ncr' 
            RETURNING id;
        `);
        console.log(`✅ all_locations: Updated ${resAll.rowCount} records.`);

        // 2. ph_barangays
        const resBar = await pool.query(`
            UPDATE ph_barangays 
            SET province = 'METRO MANILA' 
            WHERE region = 'NCR' OR region = 'ncr' OR region = 'Region NCR' 
            RETURNING id;
        `);
        console.log(`✅ ph_barangays: Updated ${resBar.rowCount} records.`);

    } catch (err) {
        console.error('❌ Error during update:', err.message);
    } finally {
        await pool.end();
    }
}

updateNcrProvince();
