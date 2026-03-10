const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function clearAllLocks() {
    try {
        const res = await pool.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE pid <> pg_backend_pid()
      AND datname = current_database();
    `);
        console.log(`Terminated ${res.rowCount} backends.`);
    } catch (err) {
        console.error('Error clearing locks:', err);
    } finally {
        pool.end();
    }
}

clearAllLocks();
