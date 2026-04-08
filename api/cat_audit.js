import pg from 'pg';
import dotenv from 'dotenv';
import { writeFileSync } from 'fs';
dotenv.config({ path: './.env' });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
    const res = await pool.query(
        `SELECT project_category, COUNT(*)::int as cnt 
         FROM engineer_form 
         WHERE project_category IS NOT NULL AND TRIM(project_category) != ''
         GROUP BY project_category ORDER BY project_category`
    );
    writeFileSync('api/cat_audit.json', JSON.stringify(res.rows, null, 2), 'utf8');
    await pool.end();
    process.exit(0);
}
run();
