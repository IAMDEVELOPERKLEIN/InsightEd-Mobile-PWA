
const pg = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function updateNcrProvinceAllCaps() {
    try {
        console.log('--- Standardizing NCR Province to "METRO MANILA" (ALL CAPS) ---');
        
        // 1. schools_IERN
        const resIern = await pool.query(`
            UPDATE "schools_IERN" 
            SET "Province" = 'METRO MANILA' 
            WHERE "Region" = 'NCR' OR "Region" = 'ncr' 
            RETURNING id;
        `);
        console.log(`✅ schools_IERN: Updated ${resIern.rowCount} records.`);

        // 2. all_locations
        const resAll = await pool.query(`
            UPDATE all_locations 
            SET province = 'METRO MANILA' 
            WHERE region = 'NCR' OR region = 'ncr' 
            RETURNING id;
        `);
        console.log(`✅ all_locations: Updated ${resAll.rowCount} records.`);

        // 3. ph_barangays
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

updateNcrProvinceAllCaps();
