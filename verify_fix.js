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
async function verify() {
    try {
        const region = 'Region III';
        console.log(`\n--- VERIFYING FIX FOR REGION: ${region} ---\n`);

        // simulate the API query after fix
        const query = `
            WITH LatestProjects AS (
                SELECT DISTINCT ON (COALESCE(ipc, project_id::text)) 
                    project_id, project_name, school_id, school_name, region, division, created_at
                FROM engineer_form
                ORDER BY COALESCE(ipc, project_id::text), created_at DESC
            )
            SELECT * FROM LatestProjects
            WHERE UPPER(TRIM(region)) = UPPER(TRIM($1))
        `;
        const res = await pool.query(query, [region]);

        console.log(`Projects returned by fixed query: ${res.rows.length}`);
        res.rows.forEach(r => {
            console.log(`- ID: ${r.project_id}, IPC: ${r.ipc}, Region: "${r.region}", School: ${r.school_name}`);
        });

        if (res.rows.length >= 5) {
            console.log("\n✅ SUCCESS: Verification passed. All projects are now visible.");
        } else {
            console.log(`\n❌ FAILURE: Expected at least 5 projects, but found ${res.rows.length}.`);
        }

    } catch (err) { console.error("\nVERIFICATION FAILED:", err.message); } finally { await pool.end(); }
}
verify();
