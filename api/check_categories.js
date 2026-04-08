import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: './.env' });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
    try {
        const res = await pool.query(
            `SELECT project_category, COUNT(*) as cnt 
             FROM engineer_form 
             WHERE project_category IS NOT NULL AND TRIM(project_category) != ''
             GROUP BY project_category ORDER BY project_category`
        );
        const lines = ['=== Current project_category values ==='];
        res.rows.forEach(r => lines.push(`[${r.cnt}] "${r.project_category}"`));
        lines.push(`\nTotal distinct: ${res.rows.length}`);
        const output = lines.join('\n');
        fs.writeFileSync('api/category_check.log', output, 'utf8');
        console.log('Written to api/category_check.log');
    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}
run();
