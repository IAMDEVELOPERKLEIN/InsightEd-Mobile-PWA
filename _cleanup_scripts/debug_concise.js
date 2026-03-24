import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';
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
    } catch (e) { }
}
const pool = new pg.Pool({
    connectionString: dbUrl || 'postgres://postgres:password@localhost:5432/postgres',
    ssl: dbUrl && !dbUrl.includes('localhost') ? { rejectUnauthorized: false } : false
});
async function debug() {
    try {
        const res = await pool.query("SELECT project_id, ipc, school_name, project_name FROM engineer_form WHERE region = 'Region III' ORDER BY created_at DESC");
        console.log(`RAW_COUNT: ${res.rows.length}`);
        res.rows.forEach(r => console.log(`ID:${r.project_id}|IPC:${r.ipc}|SCHOOL:${r.school_name}|NAME:${r.project_name}`));
    } catch (err) { console.error(err.message); } finally { await pool.end(); }
}
debug();
