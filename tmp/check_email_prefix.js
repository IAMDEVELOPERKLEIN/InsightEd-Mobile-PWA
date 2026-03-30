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
        console.log('Testing email prefix matching:');
        
        const testEmail = '119083@deped.gov.ph';
        const prefix = testEmail.split('@')[0];
        
        const res = await pool.query('SELECT "SchoolID", "School_Name" FROM "schools_IERN" WHERE "SchoolID" = $1', [prefix]);
        console.log(`Email Prefix '${prefix}':`, res.rows[0]);

        // General audit: How many users have an email prefix that is a valid SchoolID?
        const auditRes = await pool.query(`
            SELECT count(*) 
            FROM users u
            WHERE u.role = 'School Head' AND u.school_id IS NULL AND u.email LIKE '%@deped.gov.ph'
            AND EXISTS (
                SELECT 1 FROM "schools_IERN" s 
                WHERE s."SchoolID" = SPLIT_PART(u.email, '@', 1)
            )
        `);
        console.log('Users with matching email-prefix-as-SchoolID:', auditRes.rows[0].count);

    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await pool.end();
    }
}
check();
