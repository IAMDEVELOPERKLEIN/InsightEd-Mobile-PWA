
const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkTables() {
    try {
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('system_settings', 'schools_IERN', 'users')
        `);
        console.log('Existing Tables:', res.rows.map(r => r.table_name));

        if (res.rows.some(r => r.table_name === 'system_settings')) {
            const settings = await pool.query('SELECT * FROM system_settings');
            console.log('System Settings Rows:', settings.rows);
        }

        if (res.rows.some(r => r.table_name === 'schools_IERN')) {
            const count = await pool.query('SELECT count(*) FROM "schools_IERN"');
            console.log('schools_IERN Count:', count.rows[0].count);
        }
    } catch (err) {
        console.error('DB Check Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkTables();
