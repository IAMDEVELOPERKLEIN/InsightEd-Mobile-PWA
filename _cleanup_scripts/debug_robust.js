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
        if (match) {
            dbUrl = match[1].trim().replace(/^['"]|['"]$/g, '');
        }
    } catch (e) {
        console.error("⚠️ Failed to manually parse .env:", e.message);
    }
}

if (!dbUrl) {
    dbUrl = 'postgres://postgres:password@localhost:5432/postgres';
}

const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');

const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: isLocal ? false : { rejectUnauthorized: false }
});

async function debug() {
    try {
        const region = 'Region III';
        console.log(`\n--- ROBUST DEBUG: ${region} ---\n`);

        const allRes = await pool.query(`
            SELECT project_id, project_name, school_id, school_name, region, division, ipc, created_at
            FROM engineer_form
            WHERE TRIM(region) = $1
            ORDER BY created_at DESC
        `, [region]);

        console.log(`1. Total records in [engineer_form]: ${allRes.rows.length}`);
        allRes.rows.forEach(r => {
            console.log(`   - ID: ${r.project_id}, Name: ${r.project_name}, School: ${r.school_name}, IPC: ${r.ipc}`);
        });

        const latestRes = await pool.query(`
            WITH LatestProjects AS (
                SELECT DISTINCT ON (COALESCE(ipc, project_id::text)) 
                    project_id, project_name, school_id, school_name, region, division, ipc, created_at
                FROM engineer_form
                ORDER BY COALESCE(ipc, project_id::text), created_at DESC
            )
            SELECT * FROM LatestProjects
            WHERE TRIM(region) = $1
        `, [region]);

        console.log(`\n2. Total "Latest" (API Logic): ${latestRes.rows.length}`);
        latestRes.rows.forEach(r => {
            console.log(`   - ID: ${r.project_id}, Name: ${r.project_name}, School: ${r.school_name}, IPC: ${r.ipc}`);
        });

    } catch (err) {
        console.error("\nDEBUG FAILED:", err.message);
        if (err.stack) console.error(err.stack);
    } finally {
        await pool.end();
    }
}

debug();
