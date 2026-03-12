const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
    ssl: { rejectUnauthorized: false }
});

async function analyze() {
    try {
        console.log('--- All Engineers in System ---');
        const users = await pool.query(`
            SELECT uid, email, role, first_name, last_name 
            FROM users 
            WHERE role ILIKE '%engineer%'
        `);
        users.rows.forEach(r => {
            console.log(`UID: ${r.uid}, Email: ${r.email}, Name: ${r.first_name} ${r.last_name}, Role: ${r.role}`);
        });

        console.log('\n--- Project Distribution Detailed ---');
        const res = await pool.query(`
            SELECT engineer_id, engineer_name, COUNT(*) as count 
            FROM engineer_form 
            GROUP BY engineer_id, engineer_name
            ORDER BY count DESC
        `);
        res.rows.forEach(r => {
            console.log(`ID: ${r.engineer_id}, Name: ${r.engineer_name}, Count: ${r.count}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

analyze();
