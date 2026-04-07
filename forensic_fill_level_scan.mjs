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
        console.log("🔍 [ADA Forensic] Starting Step 2: Fill-Level Scan...");
        
        // 1. Get the Safe IDs (No Documents)
        const linkageResults = JSON.parse(fs.readFileSync('forensic_linkage_results.json', 'utf8'));
        const safeIds = linkageResults.safe_ids;
        
        console.log(`📡 Analyzing fill-level for ${safeIds.length} safe records...`);

        // 2. Identify all data columns
        const colRes = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'engineer_form' AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        const contentCols = colRes.rows
            .map(r => r.column_name)
            .filter(c => !['project_id', 'ipc', 'created_at'].includes(c));

        // 3. Score the fill level for each row
        // We'll process in chunks to avoid memory issues (22k rows)
        const chunkSize = 1000;
        const fillStats = [];

        for (let i = 0; i < safeIds.length; i += chunkSize) {
            const chunk = safeIds.slice(i, i + chunkSize);
            console.log(`⏳ Processing chunk ${i / chunkSize + 1}...`);
            
            // Build a dynamic query to count non-null columns
            const nonNullParts = contentCols.map(c => `(CASE WHEN "${c}" IS NOT NULL AND "${c}"::text != '' THEN 1 ELSE 0 END)`).join(' + ');
            
            const scoreQuery = `
                SELECT 
                    project_id,
                    (${nonNullParts}) as fill_score,
                    round(((${nonNullParts})::float / ${contentCols.length}) * 100) as fill_percentage
                FROM engineer_form
                WHERE project_id = ANY($1)
            `;

            const res = await pool.query(scoreQuery, [chunk]);
            fillStats.push(...res.rows);
        }

        // 4. Summarize results
        const summary = {
            total_scanned: fillStats.length,
            average_fill_percentage: fillStats.reduce((sum, r) => sum + r.fill_percentage, 0) / fillStats.length,
            zombies: fillStats.filter(r => r.fill_percentage < 10).length, // Less than 10% data
            partial: fillStats.filter(r => r.fill_percentage >= 10 && r.fill_percentage < 50).length,
            rich: fillStats.filter(r => r.fill_percentage >= 50).length,
            fill_stats: fillStats
        };

        fs.writeFileSync('forensic_fill_level_results.json', JSON.stringify(summary, null, 2));
        console.log(`✅ Fill-Level results saved: forensic_fill_level_results.json`);
        console.log(`   - Zombie Rows (<10% data): ${summary.zombies}`);
        console.log(`   - Data-Rich Clones (>50% data): ${summary.rich}`);

    } catch (err) {
        console.error("❌ Fill-Level Scan Failed:", err.message);
    } finally {
        pool.end();
    }
}

run();
