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
        const uRes = await pool.query("SELECT count(*) FROM users WHERE role = 'School Head'");
        const sRes = await pool.query("SELECT count(*) FROM ph_schools");
        
        // Find schools in ph_schools that don't have a user
        const orphanedRes = await pool.query(`
            SELECT count(*) FROM ph_schools 
            WHERE school_id NOT IN (SELECT school_id FROM users WHERE role = 'School Head' AND school_id IS NOT NULL)
        `);
        
        console.log('Registered School Heads (users table):', uRes.rows[0].count);
        console.log('Total Schools (ph_schools table):', sRes.rows[0].count);
        console.log('Orphaned Schools (in ph_schools but no registered head):', orphanedRes.rows[0].count);
        
    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await pool.end();
    }
}
check();
