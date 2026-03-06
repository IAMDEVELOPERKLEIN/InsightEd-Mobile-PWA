const { Pool } = require('pg');
const pool = new Pool({ 
    connectionString: 'postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

async function listTables() {
    try {
        const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
        console.log("Tables in DB:");
        res.rows.forEach(row => console.log("- " + row.table_name));
    } catch (err) {
        console.error("Error listing tables:", err.message);
    } finally {
        await pool.end();
    }
}

listTables();
