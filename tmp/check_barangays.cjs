
const pg = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkBarangays() {
    try {
        console.log('Checking unique barangays in schools_IERN...');
        const res = await pool.query('SELECT count(DISTINCT "Barangay") FROM "schools_IERN"');
        console.log('Total unique barangays in schools_IERN:', res.rows[0].count);

        console.log('\nChecking unique combinations of Region, Province, Municipality, Barangay in schools_IERN...');
        const resCombo = await pool.query('SELECT count(*) FROM (SELECT DISTINCT "Region", "Province", "Municipality", "Barangay" FROM "schools_IERN") as sub;');
        console.log('Total unique location combos in schools_IERN (with Barangay):', resCombo.rows[0].count);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkBarangays();
