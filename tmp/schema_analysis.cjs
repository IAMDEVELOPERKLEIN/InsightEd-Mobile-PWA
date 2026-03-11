const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('--- Engineer Form Schema ---');
        const schema = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'engineer_form'");
        console.table(schema.rows);

        console.log('\n--- Geographical Distribution in engineer_form ---');
        const geo = await pool.query(`
            SELECT region, division, province, COUNT(*) as count 
            FROM engineer_form 
            GROUP BY region, division, province
            ORDER BY count DESC
        `);
        console.table(geo.rows);

        console.log('\n--- Distinct Engineer IDs in users table ---');
        const engs = await pool.query(`SELECT uid, email, first_name, last_name, role FROM users WHERE role ILIKE '%engineer%'`);
        console.table(engs.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
