
const pg = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function listAllTables() {
    try {
        console.log('Listing all tables in public schema...');
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);
        console.log('Tables:', res.rows.map(r => r.table_name));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

listAllTables();
