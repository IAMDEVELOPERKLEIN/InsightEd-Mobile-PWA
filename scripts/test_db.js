import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

let envContent = fs.readFileSync('.env', 'utf16le');
let match = envContent.match(/DATABASE_URL=(.+)/);
if (!match) {
    envContent = fs.readFileSync('.env', 'utf8');
    match = envContent.match(/DATABASE_URL=(.+)/);
}
const dbUrl = match[1].trim().replace(/^['"]|['"]$/g, '');

const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        const res = await pool.query("SELECT school_id, total_enrollment FROM ph_schools WHERE school_id = '112155';");
        console.log(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
check();
