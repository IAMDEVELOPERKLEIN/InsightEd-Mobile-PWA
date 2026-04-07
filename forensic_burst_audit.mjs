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
        console.log("🔍 [ADA Forensic] Starting Step 3: Temporal Burst Audit...");
        
        // 1. Get the Safe IDs
        const linkageResults = JSON.parse(fs.readFileSync('forensic_linkage_results.json', 'utf8'));
        const safeIds = linkageResults.safe_ids;
        
        // 2. Identify "Creation Bursts" (rows created in the same minute)
        const burstQuery = `
            SELECT 
                date_trunc('minute', created_at) as burst_minute,
                COUNT(*) as burst_count
            FROM engineer_form
            WHERE project_id = ANY($1)
            GROUP BY 1
            HAVING COUNT(*) > 10
            ORDER BY burst_count DESC;
        `;

        const res = await pool.query(burstQuery, [safeIds]);
        
        console.log(`📡 Found ${res.rows.length} creation bursts (moments where >10 clones were born).`);

        // 3. Summarize the biggest bursts
        const finalBursts = res.rows.map(r => ({
            timestamp: r.burst_minute,
            count: parseInt(r.burst_count)
        }));

        fs.writeFileSync('forensic_burst_results.json', JSON.stringify(finalBursts, null, 2));
        console.log(`✅ Burst results saved: forensic_burst_results.json`);
        
        const totalInBursts = res.rows.reduce((sum, r) => sum + parseInt(r.burst_count), 0);
        console.log(`   - Total rows born in massive bursts (>10/min): ${totalInBursts}`);

    } catch (err) {
        console.error("❌ Burst Audit Failed:", err.message);
    } finally {
        pool.end();
    }
}

run();
