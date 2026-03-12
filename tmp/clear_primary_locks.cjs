const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function clearLocks() {
    console.log("🔍 Database: Primary (DATABASE_URL)");
    try {
        const res = await pool.query(`
      SELECT pid, state, query, wait_event_type, wait_event 
      FROM pg_stat_activity 
      WHERE datname = 'insightEd' 
      AND pid <> pg_backend_pid();
    `);
        
        console.log(`Found ${res.rowCount} other sessions.`);
        
        const terminateRes = await pool.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = 'insightEd' 
      AND (state = 'idle in transaction' OR state = 'active')
      AND pid <> pg_backend_pid();
    `);
        console.log(`Terminated ${terminateRes.rowCount} sessions.`);
    } catch (err) {
        console.error('Error clearing locks:', err);
    } finally {
        await pool.end();
        console.log("✅ Done.");
    }
}

clearLocks();
