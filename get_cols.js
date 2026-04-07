import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'engineer_form' AND table_schema = 'public' ORDER BY ordinal_position");
        const cols = res.rows.map(r => r.column_name);
        console.log(JSON.stringify(cols));
    } catch (err) {
        console.error(err.message);
    } finally {
        pool.end();
    }
}
run();
