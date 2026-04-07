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
        console.log("🔍 [ADA Forensic] Verifying identical records row-by-row (using MD5 hashing)...");
        
        // 1. Identify TOP 5 "Identical Content" clusters by hashing the whole row (cast to text)
        // Note: we must keep project_id, ipc, created_at OUT of the hash!
        
        // Let's get the content columns first
        const colRes = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'engineer_form' AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        const contentCols = colRes.rows
            .map(r => r.column_name)
            .filter(c => !['project_id', 'ipc', 'created_at'].includes(c));

        const contentSql = contentCols.map(c => `coalesce("${c}"::text, '')`).join(" || ' | ' || ");

        // 2. Run the grouped query using the content hash
        const query = `
            WITH HashedProjects AS (
                SELECT 
                    project_id, ipc, created_at, school_name, project_name, approved_budget_for_contract,
                    md5(${contentSql}) as content_hash
                FROM engineer_form
            ),
            TopClusters AS (
                SELECT content_hash, COUNT(*) as cluster_size
                FROM HashedProjects
                GROUP BY content_hash
                HAVING COUNT(*) > 1
                ORDER BY cluster_size DESC
                LIMIT 5
            )
            SELECT 
                tc.cluster_size,
                hp.project_id, hp.ipc, hp.created_at, hp.school_name, hp.project_name, hp.approved_budget_for_contract,
                hp.content_hash
            FROM HashedProjects hp
            JOIN TopClusters tc ON hp.content_hash = tc.content_hash
            ORDER BY tc.cluster_size DESC, hp.content_hash, hp.project_id ASC;
        `;

        const res = await pool.query(query);
        
        if (res.rows.length === 0) {
            console.log("✅ No identical content clusters found.");
        } else {
            fs.writeFileSync('row_by_row_verification_hash.json', JSON.stringify(res.rows, null, 2));
            console.log(`✅ Results saved to row_by_row_verification_hash.json (${res.rows.length} rows)`);

            // Also format for display
            console.log("\n--- Sample of Identical Rows (Showing 'Where They Are Different') ---");
            const firstClusterHash = res.rows[0].content_hash;
            console.table(res.rows.filter(r => r.content_hash === firstClusterHash).slice(0, 10));
        }

    } catch (err) {
        console.error("❌ SQL Forensic Failure:", err.message);
    } finally {
        pool.end();
    }
}

run();
