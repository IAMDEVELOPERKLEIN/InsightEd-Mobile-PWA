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
        console.log('--- Database Audit: ph_ Tables ---');
        
        // 1. Get List of Tables starting with ph_
        const tablesRes = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name LIKE 'ph_%'
            ORDER BY table_name;
        `);
        const tables = tablesRes.rows.map(r => r.table_name);
        console.log('Found tables:', tables.join(', '));

        // 2. For each table, check for school_id column and orphaned count
        const auditResults = [];
        for (const table of tables) {
            const hasSchoolIdRes = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = $1 AND column_name = 'school_id'
            `, [table]);
            
            if (hasSchoolIdRes.rows.length > 0) {
                // Determine orphaned count (school_id not in the set of registered users)
                // We define "registered" as users with registrant_type IS NOT NULL
                const countRes = await pool.query(`
                    SELECT 
                        count(*) as total,
                        count(*) FILTER (WHERE school_id NOT IN (SELECT school_id FROM users WHERE registrant_type IS NOT NULL AND school_id IS NOT NULL)) as orphaned
                    FROM "${table}"
                `);
                auditResults.push({
                    table,
                    total: countRes.rows[0].total,
                    orphaned: countRes.rows[0].orphaned
                });
            } else {
                const totalRes = await pool.query(`SELECT count(*) FROM "${table}"`);
                auditResults.push({
                    table,
                    total: totalRes.rows[0].count,
                    orphaned: 'No school_id col'
                });
            }
        }
        console.table(auditResults);

    } catch (e) {
        console.error('AUDIT ERROR:', e.message);
    } finally {
        await pool.end();
    }
}
audit();
