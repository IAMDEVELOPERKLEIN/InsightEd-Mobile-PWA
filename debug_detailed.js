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
        const res = await pool.query(`
            SELECT project_id, ipc, school_id, school_name, project_name, created_at 
            FROM engineer_form 
            WHERE region = 'Region III' 
            ORDER BY created_at DESC
        `);
        console.log(`TOTAL_RECORDS: ${res.rows.length}`);
        res.rows.forEach(r => {
            console.log(`-----------------------------------`);
            console.log(`Project ID: ${r.project_id}`);
            console.log(`IPC: ${r.ipc}`);
            console.log(`School ID: ${r.school_id}`);
            console.log(`School Name: ${r.school_name}`);
            console.log(`Project Name: ${r.project_name}`);
            console.log(`Created At: ${r.created_at}`);
        });
    } catch (err) { console.error(err.message); } finally { await pool.end(); }
}
debug();
