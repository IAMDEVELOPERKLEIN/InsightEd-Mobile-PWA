
const pg = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function updatePhBarangaysNcr() {
    try {
        console.log('Updating NCR province to "Metro Manila" in ph_barangays...');
        
        // Using Case-Insensitive check for NCR
        const res = await pool.query(`
            UPDATE ph_barangays 
            SET province = 'Metro Manila' 
            WHERE region = 'NCR' OR region = 'ncr' OR region = 'Region NCR' 
            RETURNING id;
        `);
        
        console.log(`✅ Successfully updated ${res.rowCount} records in ph_barangays.`);

    } catch (err) {
        console.error('❌ Error updating ph_barangays:', err.message);
    } finally {
        await pool.end();
    }
}

updatePhBarangaysNcr();
