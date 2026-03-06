import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config({ path: '.env.utf8' });

console.log('Current Directory:', process.cwd());
console.log('DATABASE_URL defined:', !!process.env.DATABASE_URL);
if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is missing from environment!');
    process.exit(1);
}

const isLocal = process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocal ? false : { rejectUnauthorized: false }
});

async function check() {
    try {
        console.log('Connecting to:', process.env.DATABASE_URL.split('@')[1] || 'URL');
        const client = await pool.connect();
        console.log('Connected successfully!');
        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'engineer_form' ORDER BY ordinal_position");
        console.log('Total Columns:', res.rows.length);
        res.rows.forEach((r, i) => {
            console.log(`${i + 1}: ${r.column_name}`);
        });
        client.release();
    } catch (err) {
        console.error('DATABASE ERROR:', err.message);
        console.error(err.stack);
    } finally {
        await pool.end();
    }
}

check();
