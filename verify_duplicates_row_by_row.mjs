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
        console.log("🔍 [ADA Forensic] Verifying identical records row-by-row...");
        
        // 1. Get Column names for grouping
        const colRes = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'engineer_form' AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        const groupCols = colRes.rows
            .map(r => r.column_name)
            .filter(c => !['project_id', 'ipc', 'created_at'].includes(c));

        // 2. Fetch the top 3 most "crowded" duplicate clusters
        const clusterRes = await pool.query(`
            SELECT ${groupCols.join(', ')}, COUNT(*) as cluster_size
            FROM engineer_form
            GROUP BY ${groupCols.join(', ')}
            HAVING COUNT(*) > 1
            ORDER BY cluster_size DESC
            LIMIT 3
        `);

        if (clusterRes.rows.length === 0) {
            console.log("✅ No identical content clusters found.");
            return;
        }

        const fullComparison = [];

        // 3. For each cluster, fetch all individual rows
        for (const cluster of clusterRes.rows) {
            console.log(`🧐 Fetching individual rows for cluster: ${cluster.school_name} | ${cluster.project_name} (Size: ${cluster.cluster_size})`);
            
            // Build the WHERE clause dynamically for the cluster
            const whereClause = groupCols.map((c, i) => {
                const val = cluster[c];
                if (val === null) return `"${c}" IS NULL`;
                if (typeof val === 'string') return `"${c}" = $${i + 1}`;
                return `"${c}" = $${i + 1}`;
            }).join(' AND ');

            const params = groupCols.map(c => cluster[c]).filter(v => v !== null);
            
            // We only need project_id, ipc, and created_at to show "where they are different" 
            const rowRes = await pool.query(`
                SELECT project_id, ipc, created_at, school_name, project_name, approved_budget_for_contract, funding_year 
                FROM engineer_form 
                WHERE ${whereClause}
                ORDER BY project_id ASC
            `, params);

            fullComparison.push({
                cluster_info: { school: cluster.school_name, project: cluster.project_name, size: cluster.cluster_size },
                individual_rows: rowRes.rows
            });
        }

        fs.writeFileSync('row_by_row_verification.json', JSON.stringify(fullComparison, null, 2));
        console.log("\n✅ Detailed comparison saved: row_by_row_verification.json");

    } catch (err) {
        console.error("❌ Forensic Failure:", err.message);
    } finally {
        pool.end();
    }
}

run();
