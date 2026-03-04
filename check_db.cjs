const { Pool } = require('pg');
require('dotenv').config();
const dbUrl = process.env.DATABASE_URL;
const pool = new Pool({
    connectionString: dbUrl
});

async function check() {
    try {
        const res = await pool.query('SELECT assigned_to, COUNT(*) FROM congressional_initiatives GROUP BY assigned_to');
        console.log('Assignment Summary:', JSON.stringify(res.rows, null, 2));
        const res2 = await pool.query('SELECT COUNT(*) FROM congressional_initiatives');
        console.log('Total Initiatives:', res2.rows[0].count);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        pool.end();
    }
}

check();
