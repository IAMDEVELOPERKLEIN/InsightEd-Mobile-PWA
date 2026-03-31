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
        const res = await pool.query('SELECT DISTINCT "Region" FROM "schools_IERN" LIMIT 10');
        console.log('Regions:', res.rows.map(r => r.Region));
        
        const res2 = await pool.query('SELECT DISTINCT "Division" FROM "schools_IERN" WHERE "Region" ILIKE \'%Region V%\' LIMIT 10');
        console.log('Divisions in Region V:', res2.rows.map(r => r.Division));

        const res3 = await pool.query('SELECT COUNT(*) FROM "schools_IERN" WHERE "Region" = \'Region V\' AND "Division" = \'Albay\'');
        console.log('Count for Region V / Albay:', res3.rows[0].count);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkData();
