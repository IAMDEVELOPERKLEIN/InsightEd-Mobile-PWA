import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function seedExpandedTestSchools() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('🌱 Seeding/Updating 1000 test schools (IDs 999000–999999)...');

        for (let id = 999000; id <= 999999; id++) {
            const lat = 4.5 + (Math.random() * 16.5);
            const lng = 116.0 + (Math.random() * 11.0);
            
            await client.query(
                `INSERT INTO \"schools_IERN\"
                    (\"SchoolID\", \"School_Name\", \"Region\", \"Division\", \"District\", \"Province\", \"Municipality\", \"Legislative_District\", \"iern\", \"Latitude\", \"Longitude\")
                 VALUES ($1, $2, 'Blank Region', 'Blank Division', 'Blank District', 'Blank Province', 'Blank Municipality', 'Blank District', $1, $3, $4)
                 ON CONFLICT (\"SchoolID\") DO UPDATE SET
                    \"Latitude\" = EXCLUDED.\"Latitude\",
                    \"Longitude\" = EXCLUDED.\"Longitude\"`,
                [id.toString(), `${id} Test School`, lat, lng]
            );
        }

        await client.query('COMMIT');
        console.log(`✅ Success: 1000 test schools are now seeded with coordinates.`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error during seeding:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}
seedExpandedTestSchools();
