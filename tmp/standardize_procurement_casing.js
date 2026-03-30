import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;
const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

async function run() {
    try {
        console.log('--- Standardizing Database Strings ---');
        const res = await pool.query("UPDATE engineer_form SET procurement_status = 'Under procurement' WHERE procurement_status = 'Under Procurement'");
        console.log(`Updated ${res.rowCount} records for 'Under procurement'`);
    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await pool.end();
    }
}
run();
