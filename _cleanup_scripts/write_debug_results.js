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
        let output = `TOTAL_RECORDS: ${res.rows.length}\n`;
        res.rows.forEach(r => {
            output += `-----------------------------------\n`;
            output += `Project ID: ${r.project_id}\n`;
            output += `IPC: ${r.ipc}\n`;
            output += `School ID: ${r.school_id}\n`;
            output += `School Name: ${r.school_name}\n`;
            output += `Project Name: ${r.project_name}\n`;
            output += `Created At: ${r.created_at}\n`;
        });
        fs.writeFileSync('debug_final_results.txt', output, 'utf8');
        console.log("Results written to debug_final_results.txt");
    } catch (err) { console.error(err.message); } finally { await pool.end(); }
}
debug();
