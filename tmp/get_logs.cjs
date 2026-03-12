const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('--- Recent Activity Logs ---');
        const logs = await pool.query("SELECT * FROM activity_logs WHERE timestamp > NOW() - INTERVAL '4 hours' ORDER BY timestamp DESC LIMIT 100");
        logs.rows.forEach(r => {
            console.log(`${r.timestamp.toISOString()} | ${r.action_type} | ${r.target_entity} | ${r.details}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
