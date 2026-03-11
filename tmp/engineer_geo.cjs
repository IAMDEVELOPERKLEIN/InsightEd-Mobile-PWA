const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('--- Engineer Geographical Tags ---');
        const users = await pool.query(`
            SELECT uid, email, first_name, last_name, role, region, division, province, city 
            FROM users 
            WHERE role ILIKE '%engineer%'
        `);
        users.rows.forEach(r => {
            console.log(`Name: ${r.first_name} ${r.last_name}, Role: ${r.role}, Geo: ${r.region} | ${r.division} | ${r.province} | ${r.city}`);
            console.log(`UID: ${r.uid}`);
            console.log('-------------------');
        });

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
