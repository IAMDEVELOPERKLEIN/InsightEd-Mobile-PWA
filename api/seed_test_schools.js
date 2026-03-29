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

async function seedTestSchools() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('🌱 Seeding 100 test schools (IDs 999900–999999)...');

        let inserted = 0;
        let skipped = 0;

        for (let id = 999900; id <= 999999; id++) {
            const result = await client.query(
                `INSERT INTO "schools_IERN"
                    ("SchoolID", "School_Name", "Region", "Division", "District", "Province", "Municipality", "Legislative_District", "iern")
                 VALUES ($1, $2, 'Blank Region', 'Blank Division', 'Blank District', 'Blank Province', 'Blank Municipality', 'Blank District', $1)
                 ON CONFLICT ("SchoolID") DO NOTHING`,
                [id.toString(), `${id} Test School`]
            );
            if (result.rowCount > 0) inserted++;
            else skipped++;
        }

        await client.query('COMMIT');

        console.log(`✅ Done. Inserted: ${inserted}, Skipped (already existed): ${skipped}`);

        // Verify
        const check = await client.query(
            `SELECT COUNT(*) FROM "schools_IERN" WHERE "Region" = 'Blank Region'`
        );
        console.log(`📊 Total schools in 'Blank Region': ${check.rows[0].count}`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error during seeding:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

seedTestSchools();
