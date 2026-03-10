import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

// Try to load .env manually if standard dotenv fails (due to encoding)
if (fs.existsSync('.env')) {
    const content = fs.readFileSync('.env', 'utf8');
    const lines = content.split('\n');
    lines.forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Common requirement for Azure/Vercel DBs
});

async function debug() {
    try {
        const region = 'Region III';
        console.log(`\n--- DEBUGGING PROJECTS FOR REGION: ${region} ---\n`);

        // 1. Check all projects in engineer_form with this region (no grouping)
        const allRes = await pool.query(`
            SELECT project_id, project_name, school_id, school_name, region, division, ipc, created_at
            FROM engineer_form
            WHERE TRIM(region) = $1
            ORDER BY created_at DESC
        `, [region]);

        console.log(`1. Total records in [engineer_form] matching "${region}": ${allRes.rows.length}`);
        allRes.rows.forEach(r => {
            console.log(`   - ID: ${r.project_id}, Name: ${r.project_name}, School: ${r.school_name}, IPC: ${r.ipc}, Date: ${r.created_at}`);
        });

        // 2. Check the "LatestProjects" logic used in the API
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

        console.log(`\n2. Total "Latest" projects (using API grouping logic) in region "${region}": ${latestRes.rows.length}`);
        latestRes.rows.forEach(r => {
            console.log(`   - ID: ${r.project_id}, Name: ${r.project_name}, School: ${r.school_name}, IPC: ${r.ipc}`);
        });

        // 3. Count by IPC to see if there are duplicates
        const dupRes = await pool.query(`
            SELECT ipc, COUNT(*) as count, ARRAY_AGG(project_id) as ids
            FROM engineer_form
            WHERE TRIM(region) = $1 AND ipc IS NOT NULL
            GROUP BY ipc
            HAVING COUNT(*) > 1
        `, [region]);

        if (dupRes.rows.length > 0) {
            console.log(`\n3. Found shared IPCs in "${region}":`);
            dupRes.rows.forEach(r => {
                console.log(`   - IPC: "${r.ipc}" is shared by ${r.count} records: IDs [${r.ids.join(', ')}]`);
            });
        } else {
            console.log(`\n3. No shared IPCs found in "${region}".`);
        }

    } catch (err) {
        console.error("\nERROR DURING DEBUG:");
        console.error(err);
    } finally {
        await pool.end();
    }
}

debug();
