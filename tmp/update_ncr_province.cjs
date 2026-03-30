
const pg = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function updateNCRProvince() {
    try {
        console.log('Checking current province values for region NCR...');
        const checkRes = await pool.query(`
            SELECT DISTINCT province, count(*) 
            FROM "schools_IERN" 
            WHERE region = 'NCR' 
            GROUP BY province;
        `);
        console.log('Current NCR Provinces:', checkRes.rows);

        console.log('\nUpdating province to "Metro Manila" for region NCR...');
        const updateRes = await pool.query(`
            UPDATE "schools_IERN" 
            SET province = 'Metro Manila' 
            WHERE region = 'NCR';
        `);
        console.log(`Update complete. Rows affected: ${updateRes.rowCount}`);

        console.log('\nVerifying update...');
        const verifyRes = await pool.query(`
            SELECT DISTINCT province, count(*) 
            FROM "schools_IERN" 
            WHERE region = 'NCR' 
            GROUP BY province;
        `);
        console.log('Final NCR Provinces:', verifyRes.rows);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

updateNCRProvince();
