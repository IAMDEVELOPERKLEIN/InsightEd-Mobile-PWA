const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('--- Searching log_activity for project updates ---');
        // Look for updates to engineer_form in the last few hours
        const logs = await pool.query(`
            SELECT * FROM log_activity 
            WHERE (target_table ILIKE '%engineer_form%' OR details ILIKE '%engineer_form%')
            ORDER BY created_at DESC 
            LIMIT 20
        `);
        logs.rows.forEach(r => {
            console.log(`[${r.created_at}] Action: ${r.action}, Target: ${r.target_table}`);
            console.log(`Details: ${r.details}`);
            console.log('-------------------');
        });

        // Also check if there's any 'assigned_to' column in other tables
        const cols = await pool.query("SELECT table_name, column_name FROM information_schema.columns WHERE column_name ILIKE '%engineer%' OR column_name ILIKE '%assigned%'");
        console.table(cols.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
