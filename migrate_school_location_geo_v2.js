
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

let dbUrl = process.env.DATABASE_URL;
if (!dbUrl && fs.existsSync('.env')) {
    try {
        let envContent = fs.readFileSync('.env', 'utf16le');
        let match = envContent.match(/DATABASE_URL=(.+)/);
        if (!match) {
            envContent = fs.readFileSync('.env', 'utf8');
            match = envContent.match(/DATABASE_URL=(.+)/);
        }
        if (match) {
            dbUrl = match[1].trim().replace(/^['"]|['"]$/g, '');
        }
    } catch (e) {
        console.error("⚠️ Failed to manually parse .env:", e.message);
    }
}

if (!dbUrl) {
    console.error("❌ DATABASE_URL not found.");
    process.exit(1);
}

const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false }
});

const migrate = async () => {
    const client = await pool.connect();
    try {
        console.log("🚀 Updating School Location Geo Fields...");

        // 1. Add new columns
        await client.query(`
            ALTER TABLE school_location_profiles 
            ADD COLUMN IF NOT EXISTS road_cliff_pct INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS near_water BOOLEAN DEFAULT FALSE;
        `);

        // 2. Data migration: if cliff_distance_m was set, maybe assume some percentage?
        // Actually, better to just let user re-enter or leave at 0.
        // But let's at least ensure we don't break old data.
        
        console.log("✅ New columns added.");
        console.log("🎉 Geo v2 migration completed!");

    } catch (err) {
        console.error("❌ Migration failed:", err.message);
    } finally {
        client.release();
        await pool.end();
    }
};

migrate();
