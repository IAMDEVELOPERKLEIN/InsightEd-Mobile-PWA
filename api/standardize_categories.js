import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function migrateDatabase() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log("Starting account_category standardization migration...");

        // Standardize account_category for Division and EFD Engineers
        const res = await client.query(`
            UPDATE users 
            SET account_category = 'DepEd Engineer' 
            WHERE role IN ('Division Engineer', 'DepEd Engineer', 'EFD Engineer', 'EFD', 'HRODI')
            OR account_category IN ('Division Engineer', 'EFD Engineer', 'HRODI Engineer')
        `);
        
        console.log(`✅ Standardized ${res.rowCount} users to 'DepEd Engineer' category.`);

        await client.query('COMMIT');
        console.log("Migration completed successfully.");

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("❌ Migration failed:", error);
    } finally {
        client.release();
        await pool.end();
        process.exit(0);
    }
}

migrateDatabase();
