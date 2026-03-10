const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.NEW_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function clearLocks() {
    try {
        const res = await pool.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE state = 'idle in transaction' 
      AND pid <> pg_backend_pid();
    `);
        console.log(`Terminated ${res.rowCount} idle in transaction backends.`);
    } catch (err) {
        console.error('Error clearing locks:', err);
    } finally {
        pool.end();
    }
}

clearLocks();
