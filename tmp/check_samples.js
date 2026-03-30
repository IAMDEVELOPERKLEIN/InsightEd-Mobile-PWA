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
        const uRes = await pool.query("SELECT school_id, email, iern FROM users WHERE role = 'School Head' AND school_id IS NOT NULL LIMIT 10");
        console.log('Sample Users (School Head):');
        uRes.rows.forEach(r => console.log(`User: school_id=${r.school_id}, iern=${r.iern}, email=${r.email}`));
        
        const sRes = await pool.query("SELECT school_id, school_name, iern FROM ph_schools LIMIT 10");
        console.log('\nSample ph_schools:');
        sRes.rows.forEach(r => console.log(`School: school_id=${r.school_id}, name=${r.school_name}, iern=${r.iern}`));
        
    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await pool.end();
    }
}
check();
