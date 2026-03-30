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
        // Count matches
        const matchRes = await pool.query(`
            SELECT count(*) FROM ph_schools s
            JOIN users u ON s.school_id = u.school_id
            WHERE u.role = 'School Head'
        `);
        console.log('Matches between ph_schools and users (School Head):', matchRes.rows[0].count);
        
        // Check for type mismatch or spaces
        const typesRes = await pool.query(`
            SELECT 
                (SELECT data_type FROM information_schema.columns WHERE table_name = 'ph_schools' AND column_name = 'school_id') as ph_type,
                (SELECT data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'school_id') as users_type
        `);
        console.log('Data Types:', typesRes.rows[0]);
        
        // Sample of non-matching user school_ids
        const nonMatchRes = await pool.query(`
            SELECT school_id FROM users 
            WHERE role = 'School Head' AND school_id IS NOT NULL
            AND school_id NOT IN (SELECT school_id FROM ph_schools)
            LIMIT 5
        `);
        console.log('Sample school_ids in users that are NOT in ph_schools:');
        nonMatchRes.rows.forEach(r => console.log(`'${r.school_id}'`));
        
    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await pool.end();
    }
}
check();
