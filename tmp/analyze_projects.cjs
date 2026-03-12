const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
    ssl: { rejectUnauthorized: false }
});

async function analyze() {
    try {
        console.log('--- Project Distribution by Engineer ID and Name ---');
        const res = await pool.query(`
            SELECT engineer_id, engineer_name, COUNT(*) as project_count 
            FROM engineer_form 
            GROUP BY engineer_id, engineer_name
            ORDER BY project_count DESC
        `);
        console.table(res.rows);

        console.log('\n--- Sample Projects with Names ---');
        const samples = await pool.query(`
            SELECT project_id, school_id, engineer_id, engineer_name 
            FROM engineer_form 
            LIMIT 10
        `);
        console.table(samples.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

analyze();
