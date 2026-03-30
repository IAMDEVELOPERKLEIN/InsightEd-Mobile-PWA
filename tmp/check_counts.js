import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;
const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

async function check() {
    try {
        console.log('Connecting to:', process.env.DATABASE_URL ? 'Loaded' : 'MISSING');
        const sRes = await pool.query('SELECT count(*) FROM ph_schools');
        const iRes = await pool.query('SELECT count(*) FROM "schools_IERN"');
        console.log('ph_schools count:', sRes.rows[0].count);
        console.log('schools_IERN count:', iRes.rows[0].count);
    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await pool.end();
    }
}
check().then(() => console.log('Done'));
