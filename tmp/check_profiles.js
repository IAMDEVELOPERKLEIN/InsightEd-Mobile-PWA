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
        const uRes = await pool.query("SELECT count(*) FROM users WHERE role = 'School Head' AND school_id IS NOT NULL");
        console.log('Registered School Heads:', uRes.rows[0].count);
        
        const pRes = await pool.query("SELECT count(*) FROM school_profiles");
        console.log('Total school_profiles:', pRes.rows[0].count);
        
        const matchRes = await pool.query(`
            SELECT count(*) FROM school_profiles s
            JOIN users u ON s.school_id = u.school_id
            WHERE u.role = 'School Head'
        `);
        console.log('Matches between school_profiles and users:', matchRes.rows[0].count);

        if (matchRes.rows[0].count > 0) {
            console.log('Sample matches in school_profiles:');
            const sample = await pool.query(`
                SELECT s.school_id, s.school_name FROM school_profiles s
                JOIN users u ON s.school_id = u.school_id
                WHERE u.role = 'School Head' LIMIT 5
            `);
            console.table(sample.rows);
        }
        
    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await pool.end();
    }
}
check();
