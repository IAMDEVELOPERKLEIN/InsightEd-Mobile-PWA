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
        console.log("🔍 [ADA Forensic] Identifying project collision groups (Same School/Name, different IPC)...");
        
        // 1. Identify "Smoking Gun" groups
        const groupsRes = await pool.query(`
            SELECT school_id, school_name, project_name, COUNT(DISTINCT ipc) as unique_ipc_count
            FROM engineer_form
            GROUP BY school_id, school_name, project_name
            HAVING COUNT(DISTINCT ipc) > 1
            ORDER BY unique_ipc_count DESC
            LIMIT 10
        `);

        if (groupsRes.rows.length === 0) {
            console.log("✅ No collision groups found where school/name pairs have different IPCs.");
            return;
        }

        const report = [];

        // 2. Forensically audit each group
        for (const group of groupsRes.rows) {
            console.log(`🧐 Auditing: ${group.school_name} | ${group.project_name}`);
            
            const rowsRes = await pool.query(`
                SELECT * FROM engineer_form 
                WHERE school_id = $1 AND project_name = $2
                ORDER BY created_at ASC NULLS FIRST, project_id ASC
            `, [group.school_id, group.project_name]);

            const rows = rowsRes.rows;
            const columns = Object.keys(rows[0]);
            const differences = {};

            // Find columns that differ across rows in this group
            for (const col of columns) {
                const values = rows.map(r => String(r[col]));
                const uniqueValues = [...new Set(values)];
                
                if (uniqueValues.length > 1) {
                    // This column has diversity — store it
                    differences[col] = rows.map(r => ({
                        project_id: r.project_id,
                        value: r[col]
                    }));
                }
            }

            report.push({
                school: group.school_name,
                project: group.project_name,
                collision_count: group.unique_ipc_count,
                affected_rows: rows.length,
                varying_columns: Object.keys(differences),
                detailed_differences: differences
            });
        }

        fs.writeFileSync('forensic_diff_report.json', JSON.stringify(report, null, 2));
        console.log("\n✅ Forensic Report generated: forensic_diff_report.json");

    } catch (err) {
        console.error("❌ Forensic Failure:", err.message);
    } finally {
        pool.end();
    }
}

run();
