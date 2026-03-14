import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const { Pool } = pg;
const dbUrl = process.env.DATABASE_URL;
const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function logColumns() {
    try {
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'engineer_form'
        `);
        const columns = res.rows.map(r => r.column_name).join(', ');
        fs.writeFileSync('tmp_columns.txt', columns);
        console.log('✅ Columns written to tmp_columns.txt');
    } catch (e) {
        fs.writeFileSync('tmp_columns.txt', 'Error: ' + e.message);
    }
    await pool.end();
}

logColumns();
