import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    try {
        console.log("🚀 Starting Forensic Cleanup Migration...");

        // 1. Get Column names dynamically
        const colRes = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'engineer_form' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        const allCols = colRes.rows.map(r => r.column_name);
        const partitionCols = allCols.filter(c => !['project_id', 'ipc', 'created_at'].includes(c));
        
        console.log(`📊 Discovered ${allCols.length} columns.`);
        console.log(`🔍 Partitioning by ${partitionCols.length} content columns...`);

        // 2. Create the Cleaned Table (Cloning Schema)
        console.log("📂 Creating 'engineer_form_cleaned' table...");
        await pool.query(`DROP TABLE IF EXISTS engineer_form_cleaned;`);
        await pool.query(`CREATE TABLE engineer_form_cleaned (LIKE engineer_form INCLUDING ALL);`);

        // 3. Perform the migration with Deduplication Logic
        // We use ROW_NUMBER() to identify the latest record in each duplicate cluster.
        const partitionBy = partitionCols.map(c => `"${c}"`).join(', ');
        
        console.log("⚡ Migrating data (Filtering out duplicates)...");
        const migrationQuery = `
            INSERT INTO engineer_form_cleaned
            SELECT ${allCols.map(c => `"${c}"`).join(', ')}
            FROM (
                SELECT *,
                       ROW_NUMBER() OVER (
                           PARTITION BY ${partitionBy}
                           ORDER BY created_at DESC, project_id DESC
                       ) as rn
                FROM engineer_form
            ) t
            WHERE rn = 1
        `;

        const migrateRes = await pool.query(migrationQuery);
        console.log(`✅ Migration complete!`);
        console.log(`📥 Records inserted into 'engineer_form_cleaned': ${migrateRes.rowCount}`);

        // 4. Summary counts
        const originalCount = await pool.query(`SELECT COUNT(*) FROM engineer_form`);
        const cleanedCount = await pool.query(`SELECT COUNT(*) FROM engineer_form_cleaned`);
        
        const diff = parseInt(originalCount.rows[0].count) - parseInt(cleanedCount.rows[0].count);
        
        console.log("\n--- Cleanup Summary ---");
        console.log(`Original Records: ${originalCount.rows[0].count}`);
        console.log(`Cleaned Records:  ${cleanedCount.rows[0].count}`);
        console.log(`Duplicates Removed: ${diff}`);
        console.log("-----------------------\n");

    } catch (err) {
        console.error("❌ Migration Failed:", err.message);
    } finally {
        await pool.end();
    }
}

runMigration();
