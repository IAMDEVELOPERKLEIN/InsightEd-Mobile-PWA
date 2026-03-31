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

async function checkData() {
    try {
        const res = await pool.query('SELECT DISTINCT "Division" FROM "schools_IERN" WHERE "Region" = \'Region V\' ORDER BY "Division"');
        console.log('DIVISIONS_IN_REGIONV_START');
        res.rows.forEach(r => console.log(r.Division));
        console.log('DIVISIONS_IN_REGIONV_END');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkData();
