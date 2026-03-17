const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:sebtest@localhost:5432/insighted' });

async function checkRegions() {
    try {
        const res = await pool.query('SELECT DISTINCT "Region" FROM "schools_IERN" ORDER BY "Region"');
        console.log('--- Regions in schools_IERN ---');
        console.log(JSON.stringify(res.rows, null, 2));

        const userRes = await pool.query("SELECT email, region FROM users WHERE email = 'ro5@deped.gov.ph'");
        console.log('\n--- User ro5@deped.gov.ph ---');
        console.log(JSON.stringify(userRes.rows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkRegions();
