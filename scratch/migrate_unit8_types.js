
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dbUrl = process.env.DATABASE_URL;
const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  try {
    const minsCols = [
        'emergency_response_mins', 'proximity_brgy_hall_mins', 'proximity_muni_hall_mins',
        'proximity_sdo_mins', 'proximity_clinic_mins', 'proximity_terminal_mins', 'proximity_highway_mins'
    ];
    for (const col of minsCols) {
        console.log(`Migrating ${col}...`);
        await client.query(`
            DO $$ 
            BEGIN 
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_location_profiles' AND column_name = '${col}' AND data_type = 'integer') THEN
                    ALTER TABLE school_location_profiles ALTER COLUMN ${col} TYPE NUMERIC USING ${col}::NUMERIC;
                END IF;
            END $$;
        `);
    }
    console.log("Migration complete!");
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
