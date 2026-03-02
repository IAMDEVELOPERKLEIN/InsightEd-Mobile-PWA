import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
    try {
        const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'schools' ORDER BY ordinal_position");
        console.log(res.rows.map(r => r.column_name).join('\n'));
    } catch (e) {
        console.error(e.message);
    } finally {
        process.exit(0);
    }
}
run();
