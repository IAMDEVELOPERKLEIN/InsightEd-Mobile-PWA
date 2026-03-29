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

async function verifySeed() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT COUNT(*) FROM "schools_IERN" 
            WHERE "SchoolID" >= '999000' AND "SchoolID" <= '999999' 
            AND "Latitude" IS NOT NULL AND "Longitude" IS NOT NULL;
        `);
        console.log(`📊 Count of test schools with coordinates: ${res.rows[0].count}`);

        const samples = await client.query(`
            SELECT "SchoolID", "Latitude", "Longitude" FROM "schools_IERN" 
            WHERE "SchoolID" IN ('999000', '999500', '999999')
            ORDER BY "SchoolID" ASC;
        `);
        console.log('📝 Samples:', JSON.stringify(samples.rows, null, 2));

    } catch (err) {
        console.error('❌ Error during verification:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}
verifySeed();
