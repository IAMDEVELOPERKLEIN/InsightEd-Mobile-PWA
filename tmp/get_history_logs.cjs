const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
    connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('--- Older Logs ---');
        // Search for the last 7 days of logs related to project assignment
        const logs = await pool.query(`
            SELECT * FROM activity_logs 
            WHERE timestamp > NOW() - INTERVAL '7 days'
            AND (details ILIKE '%engineer%' OR details ILIKE '%project%' OR target_entity ILIKE '%project%')
            ORDER BY timestamp DESC
            LIMIT 500
        `);
        let output = '';
        logs.rows.forEach(r => {
            output += `[${r.timestamp.toISOString()}] ${r.action_type} | ${r.target_entity} | ${r.details}\n`;
        });
        fs.writeFileSync('c:\\Users\\KleinZebastianCatapa\\Documents\\INSIGHTEDCODES2026\\tmp\\historical_logs.txt', output);
        console.log(`Saved ${logs.rows.length} logs.`);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
