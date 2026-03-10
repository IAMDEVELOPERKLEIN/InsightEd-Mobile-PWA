import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

function getDatabaseUrl() {
    if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
    try {
        if (fs.existsSync(envPath)) {
            let envContent = fs.readFileSync(envPath, 'utf16le');
            let match = envContent.match(/DATABASE_URL=(.+)/);
            if (!match) {
                envContent = fs.readFileSync(envPath, 'utf8');
                match = envContent.match(/DATABASE_URL=(.+)/);
            }
            if (match) {
                return match[1].trim().replace(/^['"]|['"]$/g, '');
            }
        }
    } catch (e) {
        console.error(`⚠️ Failed to parse .env: ${e.message}`);
    }
    return null;
}

const dbUrl = getDatabaseUrl();
const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

async function verify() {
    try {
        const client = await pool.connect();
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'engineer_form' 
            AND column_name IN ('liquidated_tranche_1', 'liquidated_tranche_2', 'liquidated_tranche_3');
        `);
        console.log("🛠️ Liquidated columns found:", res.rows.map(r => r.column_name));
        client.release();
    } catch (err) {
        console.error("❌ Verification failed:", err.message);
    } finally {
        await pool.end();
    }
}

verify();
