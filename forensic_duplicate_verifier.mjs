import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runForensicAudit() {
    try {
        console.log("🕵️  InsightEd Forensic Audit: Start...");
        
        // 1. Discover columns dynamically
        const colRes = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'engineer_form' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        const allCols = colRes.rows.map(r => r.column_name);
        const ignoreList = ['project_id', 'ipc', 'created_at'];
        const forensicCols = allCols.filter(c => !ignoreList.includes(c));
        
        console.log(`📊 Total columns discovered: ${allCols.length}`);
        console.log(`🧹 Columns to ignore: ${ignoreList.join(', ')}`);
        console.log(`🔍 Comparing across ${forensicCols.length} columns...`);

        // 2. Identify clusters
        const groupByClause = forensicCols.map(c => `"${c}"`).join(', ');
        const selectClause = forensicCols.map(c => `"${c}"`).join(', ');
        
        const clusterQuery = `
            SELECT ${selectClause}, COUNT(*) as cluster_size
            FROM engineer_form
            GROUP BY ${groupByClause}
            HAVING COUNT(*) > 1
            ORDER BY cluster_size DESC
        `;
        
        const clusterRes = await pool.query(clusterQuery);
        
        if (clusterRes.rows.length === 0) {
            console.log("✅ No duplicates found based on the criteria.");
            return;
        }
        
        console.log(`🚨 Found ${clusterRes.rows.length} duplicate clusters.`);

        const auditTrail = [];

        // 3. Deep Dive into each cluster for verification
        for (const cluster of clusterRes.rows) {
            const clusterSummary = `School: ${cluster.school_name} | Project: ${cluster.project_name} (Size: ${cluster.cluster_size})`;
            console.log(`\n🧐 Investigating Cluster: ${clusterSummary}`);

            // Build precise filter for this cluster
            const conditions = [];
            const values = [];
            let placeholderIndex = 1;

            forensicCols.forEach(col => {
                const val = cluster[col];
                if (val === null) {
                    conditions.push(`"${col}" IS NULL`);
                } else {
                    conditions.push(`"${col}" = $${placeholderIndex++}`);
                    values.push(val);
                }
            });

            const rowsRes = await pool.query(`
                SELECT project_id, ipc, created_at, school_name, project_name, latitude, longitude
                FROM engineer_form
                WHERE ${conditions.join(' AND ')}
                ORDER BY created_at ASC
            `, values);

            console.table(rowsRes.rows);
            
            auditTrail.push({
                summary: clusterSummary,
                size: cluster.cluster_size,
                matching_fields: cluster,
                individual_records: rowsRes.rows
            });
        }

        // 4. Export results
        fs.writeFileSync('forensic_audit_results.json', JSON.stringify(auditTrail, null, 2));
        console.log("\n✅ Forensic audit complete. Results saved to 'forensic_audit_results.json'");

    } catch (err) {
        console.error("❌ Forensic Error:", err);
    } finally {
        await pool.end();
    }
}

runForensicAudit();
