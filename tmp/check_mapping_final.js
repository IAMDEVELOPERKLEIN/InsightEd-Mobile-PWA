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
        console.log('Comparing school_id between users and ph_schools:');
        
        const res = await pool.query(`
            SELECT u.school_id as u_id, s.school_id as s_id, s.school_name
            FROM users u
            LEFT JOIN ph_schools s ON u.school_id = s.school_id
            WHERE u.role = 'School Head' AND u.school_id IS NOT NULL
            LIMIT 10
        `);
        
        res.rows.forEach(r => {
            console.log(`User SID: '${r.u_id}' | School SID: '${r.s_id}' | Match: ${r.u_id === r.s_id} | Name: ${r.school_name}`);
        });

        const nullCheck = await pool.query("SELECT count(*) FROM ph_schools WHERE school_id IS NULL");
        console.log('\nph_schools count with school_id IS NULL:', nullCheck.rows[0].count);

        const existsCheck = await pool.query(`
            SELECT count(*) FROM users u
            WHERE u.role = 'School Head' AND u.school_id IS NOT NULL
            AND EXISTS (SELECT 1 FROM ph_schools s WHERE s.school_id = u.school_id)
        `);
        console.log('Matches using EXISTS:', existsCheck.rows[0].count);

    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await pool.end();
    }
}
check();
