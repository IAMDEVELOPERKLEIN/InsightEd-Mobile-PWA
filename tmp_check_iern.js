import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkIernCols() {
    try {
        const actualName = 'schools_IERN';
        const cols = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = '${actualName}'
            ORDER BY ordinal_position
        `);
        console.log('COLUMNS_START');
        cols.rows.forEach(row => {
            console.log(`${row.column_name}: ${row.data_type}`);
        });
        console.log('COLUMNS_END');

        const sample = await pool.query(`SELECT * FROM "${actualName}" LIMIT 1`);
        console.log('SAMPLE_START');
        console.log(JSON.stringify(sample.rows[0], null, 2));
        console.log('SAMPLE_END');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkIernCols();
