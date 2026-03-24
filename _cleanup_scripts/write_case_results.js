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
        const query = `
            WITH LatestProjects AS (
                SELECT DISTINCT ON (COALESCE(ipc, project_id::text)) 
                    project_id, ipc, region, school_name, project_name
                FROM engineer_form
                ORDER BY COALESCE(ipc, project_id::text), created_at DESC
            )
            SELECT * FROM LatestProjects
            WHERE UPPER(TRIM(region)) = 'REGION III'
        `;
        const res = await pool.query(query);
        let output = `Latest Projects in Region III (Case-Insensitive): ${res.rows.length}\n`;
        res.rows.forEach(r => {
            output += `ID: ${r.project_id} | IPC: ${r.ipc} | Region: "${r.region}" | School: ${r.school_name}\n`;
        });

        const allRes = await pool.query(`
            SELECT project_id, ipc, region, school_name, project_name
            FROM engineer_form
            WHERE UPPER(TRIM(region)) = 'REGION III'
        `);
        output += `\nAll Records in Region III (Case-Insensitive): ${allRes.rows.length}\n`;
        allRes.rows.forEach(r => {
            output += `ID: ${r.project_id} | IPC: ${r.ipc} | Region: "${r.region}" | School: ${r.school_name}\n`;
        });

        fs.writeFileSync('case_results.txt', output, 'utf8');
        console.log("Written to case_results.txt");
    } catch (err) { console.error(err.message); } finally { await pool.end(); }
}
debug();
