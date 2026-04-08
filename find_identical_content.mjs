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
        console.log("🔍 [ADA Forensic] Identifying Absolute Content Duplicates...");
        
        // 1. Get all columns
        const colRes = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'engineer_form' AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        const allCols = colRes.rows.map(r => r.column_name);
        const excludeCols = ['project_id', 'ipc', 'created_at'];
        const groupCols = allCols.filter(c => !excludeCols.includes(c));
        
        console.log(`📡 Grouping by ${groupCols.length} content columns (excluding IDs & Metadata)...`);

        // 2. Build the group query
        // We use string_agg to see exactly which project_ids are part of each group
        const query = `
            SELECT 
                ${groupCols.join(', ')},
                COUNT(*) as dup_count,
                string_agg(project_id::text, ', ') as id_cluster,
                string_agg(DISTINCT ipc, ' | ') as ipc_cluster
            FROM engineer_form
            GROUP BY ${groupCols.join(', ')}
            HAVING COUNT(*) > 1
            ORDER BY dup_count DESC;
        `;

        const res = await pool.query(query);
        
        if (res.rows.length === 0) {
            console.log("✅ No Absolute Content Duplicates found.");
        } else {
            console.log(`⚠️ Found ${res.rows.length} groups of identical record content.`);
            fs.writeFileSync('identical_content_report.json', JSON.stringify(res.rows, null, 2));
            console.log("✅ Full Report: identical_content_report.json");
            
            // Log a summary
            console.log("\n--- Top Identical Content Clusters ---");
            res.rows.slice(0, 5).forEach(group => {
                console.log(`Group: ${group.school_name} | ${group.project_name}`);
                console.log(`   - Count: ${group.dup_count}`);
                console.log(`   - IDs: ${group.id_cluster}`);
                console.log(`   - IPCs: ${group.ipc_cluster}`);
            });
        }

        // 3. Provide the raw SQL to the user as requested
        fs.writeFileSync('audit_identical_query.sql', query);

    } catch (err) {
        console.error("❌ SQL Generation Error:", err.message);
    } finally {
        pool.end();
    }
}

run();
