const { Pool } = require('pg');
const dbUrl = 'postgres://postgres:TRIDEINSIGHTED2026@localhost:5432/insighted';
const pool = new Pool({
    connectionString: dbUrl
});

async function check() {
    try {
        const res = await pool.query('SELECT assigned_to, COUNT(*) FROM congressional_initiatives GROUP BY assigned_to');
        console.log('Assignment Summary:', JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        pool.end();
    }
}

check();
