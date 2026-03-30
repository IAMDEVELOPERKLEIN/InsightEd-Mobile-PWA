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

async function audit() {
    try {
        const res = await pool.query(`
            SELECT count(*) FROM users 
            WHERE role = 'School Head' AND registrant_type IS NULL
        `);
        console.log('TOTAL_COHORT_COUNT:', res.rows[0].count);
        
        const totalSH = await pool.query("SELECT count(*) FROM users WHERE role = 'School Head'");
        console.log('TOTAL_SCHOOL_HEADS:', totalSH.rows[0].count);

    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await pool.end();
    }
}
audit();
