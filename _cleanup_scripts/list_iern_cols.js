import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function listColumns() {
    try {
        const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'schools_IERN'");
        console.log('Columns in schools_IERN:');
        console.log(res.rows.map(r => r.column_name).join(', '));
    } catch (err) {
        console.error('Error fetching columns:', err.message);
    } finally {
        await pool.end();
    }
}

listColumns();
