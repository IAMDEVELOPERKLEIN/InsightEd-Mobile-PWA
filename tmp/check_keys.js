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
        const uRes = await pool.query("SELECT role, school_id, iern, email FROM users WHERE role = 'School Head' LIMIT 10");
        console.log('Sample Registered School Heads:');
        uRes.rows.forEach(r => console.log(`SH: email=${r.email}, school_id=${r.school_id}, iern=${r.iern}`));
        
        const counts = await pool.query(`
            SELECT 
                count(*) as total,
                count(school_id) as with_sid,
                count(iern) as with_iern
            FROM users WHERE role = 'School Head'
        `);
        console.log('\nCounts for School Head users:');
        console.log(counts.rows[0]);
        
    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await pool.end();
    }
}
check();
