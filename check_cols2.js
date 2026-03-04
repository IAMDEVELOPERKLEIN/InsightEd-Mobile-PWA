import dotenv from 'dotenv';
import pg from 'pg';
import fs from 'fs';

let envContent = fs.readFileSync('.env', 'utf8');
let match = envContent.match(/DATABASE_URL=(.+)/);
if (!match) {
    envContent = fs.readFileSync('.env', 'utf16le');
    match = envContent.match(/DATABASE_URL=(.+)/);
}
let dbUrl = match[1].trim().replace(/^['"]|['"]$/g, '');

const { Pool } = pg;
const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
        const res = await pool.query("SELECT * FROM engineer_form LIMIT 1");
        fs.writeFileSync('cols.txt', res.fields.map(f => f.name).join(', '));
    } catch (e) {
        fs.writeFileSync('cols.txt', "ERROR: " + e.message);
    } finally {
        pool.end();
    }
})();
