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
        console.log(`\n--- VERIFYING STATS FIX FOR REGION: ${region} ---\n`);

        const query = `
            WITH LatestProjects AS (
                SELECT DISTINCT ON (COALESCE(ipc, project_id::text)) 
                    school_id, accomplishment_percentage, status_of_construction_phase, approved_budget_for_contract, contract_amount, region, division
                FROM engineer_form
                ORDER BY COALESCE(ipc, project_id::text), created_at DESC
            )
            SELECT 
                COUNT(*) as total_projects
            FROM LatestProjects p
            WHERE UPPER(TRIM(p.region)) = UPPER(TRIM($1))
        `;
        const res = await pool.query(query, [region]);

        const count = parseInt(res.rows[0].total_projects);
        console.log(`Total projects returned by fixed stats query: ${count}`);

        if (count === 5) {
            console.log("\n✅ SUCCESS: Verification passed. Project count is now 5.");
        } else {
            console.log(`\n❌ FAILURE: Expected project count 5, but got ${count}.`);
        }

    } catch (err) { console.error("\nVERIFICATION FAILED:", err.message); } finally { await pool.end(); }
}
verify();
