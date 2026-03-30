import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
    const locationData = require('../src/locations.json');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(`
            CREATE TABLE IF NOT EXISTS ph_barangays (
                id SERIAL PRIMARY KEY,
                region TEXT NOT NULL,
                province TEXT NOT NULL,
                municipality TEXT NOT NULL,
                barangay TEXT NOT NULL,
                UNIQUE(region, province, municipality, barangay)
            )
        `);
        console.log('✅ Table ph_barangays created (or already exists).');

        // Flatten all entries
        const rows = [];
        for (const [region, provinces] of Object.entries(locationData)) {
            for (const [province, municipalities] of Object.entries(provinces)) {
                for (const [municipality, barangays] of Object.entries(municipalities)) {
                    for (const barangay of barangays) {
                        rows.push([region, province, municipality, barangay]);
                    }
                }
            }
        }
        console.log(`📦 Total entries to seed: ${rows.length}`);

        // Insert in batches of 500
        const BATCH_SIZE = 500;
        let inserted = 0;
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            const batch = rows.slice(i, i + BATCH_SIZE);
            const placeholders = batch.map((_, j) => `($${j * 4 + 1}, $${j * 4 + 2}, $${j * 4 + 3}, $${j * 4 + 4})`).join(', ');
            const result = await client.query(
                `INSERT INTO ph_barangays (region, province, municipality, barangay) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
                batch.flat()
            );
            inserted += result.rowCount;
        }
        console.log(`  Processed ${rows.length} entries, inserted ${inserted} new rows.`);

        await client.query('COMMIT');

        const count = await pool.query('SELECT COUNT(*) FROM ph_barangays');
        console.log(`📊 Total rows in ph_barangays: ${count.rows[0].count}`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
