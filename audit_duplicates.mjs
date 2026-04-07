import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log("🔍 Checking for duplicates based on School + Project Name + IPC...");
        const res = await pool.query(`
            SELECT 
                school_id, 
                school_name, 
                project_name, 
                ipc, 
                COUNT(*) as row_count,
                MAX(project_id) as latest_id,
                MIN(project_id) as oldest_id
            FROM engineer_form 
            GROUP BY school_id, school_name, project_name, ipc 
            HAVING COUNT(*) > 1 
            ORDER BY row_count DESC 
            LIMIT 20
        `);
        // console.table(res.rows);
        fs.writeFileSync('audit_result.json', JSON.stringify(res.rows, null, 2));
        console.log("✅ Results written to audit_result.json");

        if (res.rows.length > 0) {
            const sample = res.rows[0];
            console.log(`\n📄 Detailed view for sample duplicated group: ${sample.school_name} | ${sample.project_name} | IPC: ${sample.ipc}`);
            const detail = await pool.query(`
                SELECT project_id, ipc, project_name, status_of_construction_phase, accomplishment_percentage, created_at, status_as_of
                FROM engineer_form
                WHERE school_id = $1 AND project_name = $2 AND (ipc = $3 OR (ipc IS NULL AND $3 IS NULL))
                ORDER BY created_at ASC
            `, [sample.school_id, sample.project_name, sample.ipc]);
            // console.table(detail.rows);
            fs.writeFileSync('audit_detail.json', JSON.stringify(detail.rows, null, 2));
            console.log("✅ Detail written to audit_detail.json");
        }

    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        pool.end();
    }
}
run();
