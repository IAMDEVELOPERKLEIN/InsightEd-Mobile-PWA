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
        console.log("🔍 [ADA Forensic] Starting Step 1: Linkage Scan...");
        
        // 1. Get all suspect IDs from the duplicate groups
        const data = JSON.parse(fs.readFileSync('identical_content_report.json', 'utf8'));
        const allSuspectIds = data.flatMap(group => group.id_cluster.split(',').map(id => parseInt(id.trim())));
        
        console.log(`📡 Total Suspect IDs to scan: ${allSuspectIds.length}`);

        // 2. Query for any IDs that have associated files
        // We'll check the confirmed linkage tables
        const linkageQuery = `
            SELECT project_id, 'engineer_documents' as source FROM engineer_documents WHERE project_id = ANY($1);
        `;

        const res = await pool.query(linkageQuery, [allSuspectIds]);
        
        const linkedIds = new Set(res.rows.map(r => r.project_id));
        console.log(`⚠️ Found ${linkedIds.size} Suspect IDs that HAVE linked documents/images!`);

        // 3. Mark these as "DANGER - DO NOT DELETE"
        const finalResults = {
            total_suspects: allSuspectIds.length,
            linked_ids: Array.from(linkedIds),
            safe_ids: allSuspectIds.filter(id => !linkedIds.has(id)),
            linkage_details: res.rows
        };

        fs.writeFileSync('forensic_linkage_results.json', JSON.stringify(finalResults, null, 2));
        console.log(`✅ Linkage results saved: forensic_linkage_results.json`);
        console.log(`   - Safe IDs (No Documents): ${finalResults.safe_ids.length}`);
        console.log(`   - Danger IDs (Has Documents): ${finalResults.linked_ids.length}`);

    } catch (err) {
        console.error("❌ Linkage Scan Failed:", err.message);
    } finally {
        pool.end();
    }
}

run();
