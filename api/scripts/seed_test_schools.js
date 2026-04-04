import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function seed() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('🌱 Seeding Blank Hierarchy and Test Schools (v2)...');

        const region = 'Blank Region';
        const division = 'Blank Division';
        const district = 'Blank District';
        const municipality = 'Blank Municipality';
        const province = 'Blank Province';
        const legDistrict = 'Blank District';

        // 1. Cleanup existing test schools in range
        console.log('🧹 Cleaning up old test schools...');
        await client.query('DELETE FROM "schools_IERN" WHERE "SchoolID" BETWEEN \'999900\' AND \'999999\'');

        // 2. Insert new test schools
        console.log('📝 Inserting new test schools...');
        for (let id = 999900; id <= 999999; id++) {
            const schoolId = id.toString();
            const schoolName = `${schoolId} Test School`;
            
            await client.query(`
                INSERT INTO "schools_IERN" 
                ("SchoolID", "School_Name", "Region", "Division", "District", "Province", "Municipality", "Legislative_District", "iern")
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $1)
            `, [schoolId, schoolName, region, division, district, province, municipality, legDistrict]);
        }

        await client.query('COMMIT');
        console.log('✅ Seeding completed successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Seeding failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
