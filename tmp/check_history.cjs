const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('--- Checking for Logs/History ---');
        const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        const logTables = tables.rows.filter(r => r.table_name.includes('log') || r.table_name.includes('audit') || r.table_name.includes('history'));
        console.log('Log/History Tables:', logTables.map(t => t.table_name));

        if (logTables.some(t => t.table_name === 'log_activity')) {
            console.log('\n--- Sample log_activity ---');
            const logs = await pool.query("SELECT * FROM log_activity WHERE action ILIKE '%UPDATE%' AND target_table ILIKE '%engineer_form%' LIMIT 5");
            console.table(logs.rows);
        }

        console.log('\n--- All Engineers ---');
        const users = await pool.query(`SELECT uid, email, first_name, last_name, role FROM users WHERE role ILIKE '%engineer%'`);
        users.rows.forEach(r => console.log(`${r.uid} | ${r.email} | ${r.first_name} ${r.last_name} | ${r.role}`));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
