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
        console.log('--- Deleting Incomplete School Head Profiles ---');
        // Check count before deletion
        const currentCountRes = await pool.query("SELECT count(*) FROM users WHERE role = 'School Head' AND registrant_type IS NULL");
        console.log(`Found ${currentCountRes.rows[0].count} incomplete school head profiles...`);

        if (currentCountRes.rows[0].count > 0) {
            const res = await pool.query("DELETE FROM users WHERE role = 'School Head' AND registrant_type IS NULL");
            console.log(`Successfully deleted ${res.rowCount} records.`);
        } else {
            console.log('No records to delete.');
        }
    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await pool.end();
    }
}
run();
