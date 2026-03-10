const { Pool } = require('pg');
require('dotenv').config();

async function check() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log("Checking pg_stat_activity...");
        const res = await pool.query(`
            SELECT pid, state, query, wait_event_type, wait_event, query_start
            FROM pg_stat_activity
            WHERE datname = current_database()
            AND pid <> pg_backend_pid();
        `);
        console.table(res.rows);

        console.log("\nChecking for locks...");
        const locks = await pool.query(`
            SELECT 
                blocked_locks.pid     AS blocked_pid,
                blocked_activity.query  AS blocked_query,
                blocking_locks.pid     AS blocking_pid,
                blocking_activity.query AS blocking_query
            FROM  pg_catalog.pg_locks         blocked_locks
            JOIN  pg_catalog.pg_stat_activity blocked_activity  ON blocked_locks.pid = blocked_activity.pid
            JOIN  pg_catalog.pg_locks         blocking_locks 
                ON blocking_locks.locktype = blocked_locks.locktype
                AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
                AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
                AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
                AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
                AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
                AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
                AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
                AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
                AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
                AND blocking_locks.pid != blocked_locks.pid
            JOIN  pg_catalog.pg_stat_activity blocking_activity ON blocking_locks.pid = blocking_activity.pid
            WHERE NOT blocked_locks.granted;
        `);
        console.table(locks.rows);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

check();
