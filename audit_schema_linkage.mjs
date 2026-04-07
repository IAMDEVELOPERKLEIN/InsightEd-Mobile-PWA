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
        console.log("🔍 [ADA Forensic] Auditing Database Schema for Document Linkage...");
        
        const tablesQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name IN ('engineer_documents', 'engineer_images', 'engineer_photos', 'engineer_form_uploads');
        `;
        const tablesRes = await pool.query(tablesQuery);
        const tables = tablesRes.rows.map(r => r.table_name);
        
        console.log(`📡 Linked tables found: ${tables.join(', ')}`);

        const schemaMapping = {};

        for (const table of tables) {
            const colQuery = `
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1 
                ORDER BY ordinal_position;
            `;
            const colRes = await pool.query(colQuery, [table]);
            schemaMapping[table] = colRes.rows;
        }

        fs.writeFileSync('safety_schema_mapping.json', JSON.stringify(schemaMapping, null, 2));
        console.log("✅ Safety Schema mapping saved: safety_schema_mapping.json");

    } catch (err) {
        console.error("❌ Schema Audit Failed:", err.message);
    } finally {
        pool.end();
    }
}

run();
