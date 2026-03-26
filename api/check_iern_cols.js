import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkIernCols() {
    try {
        // Check if table exists first
        const tableCheck = await pool.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name ILIKE 'schools_iern'
        `);
        console.log('Table found:', JSON.stringify(tableCheck.rows));

        if (tableCheck.rows.length > 0) {
            const actualName = tableCheck.rows[0].table_name;
            const cols = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '${actualName}'
                ORDER BY ordinal_position
            `);
            console.log('Columns:', JSON.stringify(cols.rows, null, 2));

            // Peek at a few rows for actual data
            const sample = await pool.query(`SELECT * FROM "${actualName}" LIMIT 3`);
            console.log('Sample rows:', JSON.stringify(sample.rows, null, 2));
        } else {
            // Show all tables in case name is different
            const allTables = await pool.query(`
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' ORDER BY table_name
            `);
            console.log('All tables:', JSON.stringify(allTables.rows.map(r => r.table_name)));
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkIernCols();
