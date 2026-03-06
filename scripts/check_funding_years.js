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

async function checkFundingYears() {
    try {
        const res = await pool.query("SELECT DISTINCT funding_year FROM engineer_form WHERE funding_year IS NOT NULL ORDER BY funding_year DESC");
        console.log('Funding Years:');
        res.rows.forEach(row => console.log(`- ${row.funding_year}`));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkFundingYears();
