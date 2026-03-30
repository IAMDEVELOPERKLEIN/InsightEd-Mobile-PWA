
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
        console.log('Updating NCR province to "Metro Manila" in all_locations...');
        
        // Using Case-Insensitive check for NCR
        const res = await pool.query(`
            UPDATE all_locations 
            SET province = 'Metro Manila' 
            WHERE region = 'NCR' OR region = 'ncr' 
            RETURNING id;
        `);
        
        console.log(`✅ Successfully updated ${res.rowCount} records in all_locations.`);

    } catch (err) {
        console.error('❌ Error updating all_locations:', err.message);
    } finally {
        await pool.end();
    }
}

updateNcrProvince();
