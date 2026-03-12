
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
    console.error("❌ DATABASE_URL not found. Please check your .env file.");
    process.exit(1);
}

const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false }
});

const migrate = async () => {
    const client = await pool.connect();
    try {
        console.log("🚀 Starting School Location Module Migration...");

        await client.query(`
            CREATE TABLE IF NOT EXISTS school_location_profiles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                school_id TEXT REFERENCES ph_schools(school_id) ON DELETE CASCADE,
                
                -- Transport & Infrastructure
                transportation_modes TEXT[],
                road_paved_pct INTEGER CHECK (road_paved_pct BETWEEN 0 AND 100),
                road_unpaved_pct INTEGER CHECK (road_unpaved_pct BETWEEN 0 AND 100),
                road_lighting_pct INTEGER CHECK (road_lighting_pct BETWEEN 0 AND 100),
                public_transpo_availability SMALLINT CHECK (public_transpo_availability BETWEEN 1 AND 5),
                
                -- Geographic & Hazards
                water_proximity JSONB, -- [{ "type": "River", "distance_km": 1.5 }]
                near_cliff_ravine BOOLEAN DEFAULT FALSE,
                cliff_distance_m INTEGER,
                natural_calamities JSONB, -- [{ "type": "Flooding", "incidences": 3 }]
                hazards_experienced TEXT[],
                
                -- Access & Security
                insurgency_threats_6mo INTEGER DEFAULT 0,
                requires_hiking BOOLEAN DEFAULT FALSE,
                hiking_distance_km DECIMAL(4,2),
                manmade_bridge_foot BOOLEAN DEFAULT FALSE,
                river_crossing_no_bridge BOOLEAN DEFAULT FALSE,
                emergency_response_mins INTEGER,
                
                -- Supplemental Safety Questions
                cellular_coverage TEXT, -- 'None', 'Weak', 'Strong'
                weather_isolation BOOLEAN DEFAULT FALSE,
                
                -- Risk Index (Calculated)
                risk_index INTEGER CHECK (risk_index BETWEEN 1 AND 10),
                
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("✅ Table 'school_location_profiles' ensured.");

        // Add specialized index for school_id
        await client.query(`CREATE INDEX IF NOT EXISTS idx_slp_school_id ON school_location_profiles(school_id);`);
        
        console.log("✅ Index created.");
        console.log("🎉 Migration completed successfully!");

    } catch (err) {
        console.error("❌ Migration failed:", err.message);
    } finally {
        client.release();
        await pool.end();
    }
};

migrate();
