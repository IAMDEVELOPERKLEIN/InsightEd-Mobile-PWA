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
        console.log('--- COLUMNS ---');
        cols.rows.forEach(row => {
            console.log(row.column_name);
        });
        
        const sample = await pool.query(`SELECT * FROM "${actualName}" LIMIT 1`);
        console.log('--- SAMPLE ---');
        if (sample.rows[0]) {
            Object.keys(sample.rows[0]).forEach(key => {
                console.log(`${key}: ${sample.rows[0][key]}`);
            });
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkIernCols();
