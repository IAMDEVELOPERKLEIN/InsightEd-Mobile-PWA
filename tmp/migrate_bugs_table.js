import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log("🚀 Creating app_bugs table...");
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS app_bugs (
                id SERIAL PRIMARY KEY,
                description TEXT NOT NULL,
                metadata JSONB DEFAULT '{}'::jsonb,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("✅ Table created successfully!");
    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        await pool.end();
    }
}

migrate();
