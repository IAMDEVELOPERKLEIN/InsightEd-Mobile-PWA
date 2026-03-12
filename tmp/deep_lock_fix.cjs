const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkLocks() {
    console.log("🔍 Checking for locks on 'engineer_form' and related tables...");
    try {
        const res = await pool.query(`
            SELECT 
                pg_class.relname as table_name, 
                pg_locks.locktype, 
                pg_locks.mode, 
                pg_locks.granted, 
                pg_stat_activity.query, 
                pg_stat_activity.pid, 
                pg_stat_activity.state,
                age(now(), pg_stat_activity.query_start) as age
            FROM pg_locks 
            JOIN pg_class ON pg_locks.relation = pg_class.oid 
            JOIN pg_stat_activity ON pg_locks.pid = pg_stat_activity.pid 
            WHERE pg_class.relname IN ('engineer_form', 'ph_schools', 'schools_IERN')
            ORDER BY age DESC;
        `);
        
        if (res.rowCount === 0) {
            console.log("✅ No locks found on targeted tables.");
        } else {
            console.table(res.rows);
            
            console.log("🛠️ Attempting to terminate locking processes...");
            for (const row of res.rows) {
                if (row.pid !== process.pid) {
                    await pool.query('SELECT pg_terminate_backend($1)', [row.pid]);
                    console.log(`Terminated PID ${row.pid} holding lock on ${row.table_name}`);
                }
            }
        }

        // Also check for general 'idle in transaction' which often hold locks
        const idleRes = await pool.query(`
            SELECT pid, query, state, age(now(), query_start) as age
            FROM pg_stat_activity
            WHERE state = 'idle in transaction'
            AND pid <> pg_backend_pid();
        `);
        
        if (idleRes.rowCount > 0) {
            console.log(`⚠️ Found ${idleRes.rowCount} 'idle in transaction' sessions. Terminating...`);
            console.table(idleRes.rows);
            for (const row of idleRes.rows) {
                await pool.query('SELECT pg_terminate_backend($1)', [row.pid]);
            }
        }

    } catch (err) {
        console.error('Error checking locks:', err);
    } finally {
        await pool.end();
    }
}

checkLocks();
