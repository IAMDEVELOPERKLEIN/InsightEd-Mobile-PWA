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
        console.log("🔍 [ADA Forensic] Starting Step 4: Final Safe List Generation...");
        
        // 1. Get the Safe IDs (No Documents)
        const linkageResults = JSON.parse(fs.readFileSync('forensic_linkage_results.json', 'utf8'));
        const safeIds = new Set(linkageResults.safe_ids);
        
        // 2. Get the Fill Level results
        const fillLevelResults = JSON.parse(fs.readFileSync('forensic_fill_level_results.json', 'utf8'));
        
        // 3. Process the Clusters again
        // For each cluster, we pick ONE "Survivor" and the rest are "Safely Redundant"
        const clusterData = JSON.parse(fs.readFileSync('identical_content_report.json', 'utf8'));
        
        const deletionList = [];
        const survivorsList = [];

        clusterData.forEach(cluster => {
            const ids = cluster.id_cluster.split(',').map(id => parseInt(id.trim())).sort((a,b) => b - a); // Keep most recent project_id
            
            const survivor = ids[0];
            const redundant = ids.slice(1);
            
            // Only add to deletion list if the ID is SAFE (no documents)
            const trulySafeRedundant = redundant.filter(id => safeIds.has(id));
            
            deletionList.push(...trulySafeRedundant);
            survivorsList.push(survivor);
        });

        const finalAnalysis = {
            total_clusters_analyzed: clusterData.length,
            total_redundant_ids_attempted: clusterData.reduce((sum, g) => sum + parseInt(g.dup_count) - 1, 0),
            total_safe_to_delete: deletionList.length,
            total_whitelisted_due_to_docs: clusterData.reduce((sum, g) => sum + parseInt(g.dup_count) - 1, 0) - deletionList.length,
            deletion_list: deletionList,
            survivors_list: survivorsList
        };

        fs.writeFileSync('final_safe_deletion_list.json', JSON.stringify(finalAnalysis, null, 2));
        console.log(`✅ Final Safe List saved: final_safe_deletion_list.json`);
        console.log(`   - CONFIRMED SAFE TO DELETE: ${finalAnalysis.total_safe_to_delete}`);
        console.log(`   - WHITELISTED (KEEP): ${finalAnalysis.total_whitelisted_due_to_docs}`);

    } catch (err) {
        console.error("❌ Final Report Failed:", err.message);
    } finally {
        pool.end();
    }
}

run();
