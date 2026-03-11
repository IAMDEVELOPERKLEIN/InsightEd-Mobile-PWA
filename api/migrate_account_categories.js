import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

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

        console.log("Starting migration...");

        // 1. Migrate legacy role: "Division Engineer" should take on its specific account_category
        const res1 = await client.query(`
            UPDATE users 
            SET role = account_category 
            WHERE role = 'Division Engineer' 
            AND account_category IN ('DepEd Engineer', 'Non-DepEd Engineer')
        `);
        console.log(`Migrated ${res1.rowCount} old 'Division Engineer' roles to their specific categories.`);

        // 2. Enforce account_category = role globally (ignoring null/invalid overrides)
        const res2 = await client.query(`
            UPDATE users 
            SET account_category = role 
            WHERE account_category IS DISTINCT FROM role
        `);
        console.log(`Updated ${res2.rowCount} users to have account_category match their role.`);

        await client.query('COMMIT');
        console.log("Migration completed successfully.");

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Migration failed:", error);
    } finally {
        client.release();
        process.exit(0);
    }
}

migrateDatabase();
