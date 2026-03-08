import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

let dbUrl = process.env.DATABASE_URL;
if (!dbUrl && fs.existsSync('.env')) {
    try {
        let envContent = fs.readFileSync('.env', 'utf16le');
        let match = envContent.match(/DATABASE_URL=(.+)/);
        if (!match) {
            envContent = fs.readFileSync('.env', 'utf8');
            match = envContent.match(/DATABASE_URL=(.+)/);
        }
        if (match) dbUrl = match[1].trim().replace(/^['"]|['"]$/g, '');
    } catch (e) {
        console.error("⚠️ Failed to manually parse .env:", e.message);
    }
}

const { Pool } = pg;
const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl && dbUrl.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function checkDivisions() {
    try {
        const res = await pool.query("SELECT DISTINCT division FROM users WHERE region = 'Region V' ORDER BY division");
        console.log('Divisions in Region V:');
        res.rows.forEach(row => console.log(`- ${row.division}`));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkDivisions();
