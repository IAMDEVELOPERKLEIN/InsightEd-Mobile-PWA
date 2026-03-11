const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
    connectionString: "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd",
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('--- Today\'s Logs ---');
        const logs = await pool.query("SELECT * FROM activity_logs WHERE timestamp > CURRENT_DATE ORDER BY timestamp DESC");
        let output = '';
        logs.rows.forEach(r => {
            output += `${r.timestamp.toISOString()} | ${r.action_type} | ${r.target_entity} | ${r.details}\n`;
        });
        fs.writeFileSync('c:\\Users\\KleinZebastianCatapa\\Documents\\INSIGHTEDCODES2026\\tmp\\today_logs.txt', output);
        console.log(`Saved ${logs.rows.length} logs.`);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
