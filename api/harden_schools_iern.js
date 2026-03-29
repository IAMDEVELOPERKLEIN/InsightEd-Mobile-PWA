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

async function hardenTable() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('🛡️ Hardening "schools_IERN" table...');

        // 1. Remove duplicates if any (Keep the one with the highest ID)
        const dupCheck = await client.query(`
            DELETE FROM "schools_IERN" a USING "schools_IERN" b
            WHERE a.id < b.id AND a."SchoolID" = b."SchoolID"
        `);
        console.log(`🧹 Removed ${dupCheck.rowCount} duplicate SchoolID entries.`);

        // 2. Add Unique Constraint
        await client.query(`
            ALTER TABLE "schools_IERN" 
            ADD CONSTRAINT schools_IERN_schoolid_unique UNIQUE ("SchoolID")
        `).catch(err => {
            if (err.code === '42P16') console.log('✅ Unique constraint already exists.');
            else throw err;
        });

        await client.query('COMMIT');
        console.log('✅ Table hardened successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error hardening table:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}
hardenTable();
