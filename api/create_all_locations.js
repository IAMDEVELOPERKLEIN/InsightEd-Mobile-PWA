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

async function run() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Create the table
        await client.query(`
            CREATE TABLE IF NOT EXISTS all_locations (
                id SERIAL PRIMARY KEY,
                region TEXT,
                division TEXT,
                district TEXT,
                province TEXT,
                municipality TEXT,
                legislative_district TEXT,
                UNIQUE (region, division, district, province, municipality, legislative_district)
            );
        `);
        console.log('✅ Table all_locations created (or already exists).');

        // 2. Insert unique combinations from schools_IERN
        const result = await client.query(`
            INSERT INTO all_locations (region, division, district, province, municipality, legislative_district)
            SELECT DISTINCT
                "Region",
                "Division",
                "District",
                "Province",
                "Municipality",
                "Legislative_District"
            FROM "schools_IERN"
            WHERE "Region" IS NOT NULL
            ON CONFLICT DO NOTHING
            RETURNING id;
        `);
        console.log(`✅ Inserted ${result.rowCount} unique location combination(s).`);

        await client.query('COMMIT');

        // 3. Verify total count
        const count = await client.query('SELECT COUNT(*) FROM all_locations');
        console.log(`📊 Total rows in all_locations: ${count.rows[0].count}`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
