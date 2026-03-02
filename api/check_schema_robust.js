import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
    try {
        const res = await pool.query("SELECT * FROM schools LIMIT 1");
        if (res.rows.length > 0) {
            console.log("COLUMNS:", Object.keys(res.rows[0]).join(', '));
        } else {
            const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'schools'");
            console.log("COLUMNS (via info schema):", cols.rows.map(r => r.column_name).join(', '));
        }
    } catch (e) {
        console.error("ERROR:", e.message);
    } finally {
        process.exit(0);
    }
}
run();
