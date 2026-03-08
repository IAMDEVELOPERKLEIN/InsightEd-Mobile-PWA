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

async function verifyUser() {
    try {
        const res = await pool.query("SELECT * FROM users WHERE email = 'jonathan.narvato@deped.gov.ph'");
        console.log('User Record in PostgreSQL:');
        console.log(JSON.stringify(res.rows, null, 2));

        const projects = await pool.query("SELECT count(*) FROM engineer_form WHERE engineer_id = $1", [res.rows[0]?.uid]);
        console.log(`Linked Projects: ${projects.rows[0].count}`);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

verifyUser();
