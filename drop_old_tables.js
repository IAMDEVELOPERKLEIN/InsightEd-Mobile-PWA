import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ 
    connectionString: 'postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

async function dropDuplicateTables() {
    try {
        console.log("Dropping old ph_unit10_* tables...");
        await pool.query('DROP TABLE IF EXISTS ph_unit10_inventory CASCADE;');
        await pool.query('DROP TABLE IF EXISTS ph_unit10_demolitions CASCADE;');
        console.log("✅ Successfully dropped old duplicate tables.");
    } catch (err) {
        console.error("❌ Error dropping tables:", err.message);
    } finally {
        await pool.end();
    }
}

dropDuplicateTables();
