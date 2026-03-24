
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const migrate = async () => {
    try {
        await pool.query(`
            ALTER TABLE engineer_form 
            ADD COLUMN IF NOT EXISTS validation_status VARCHAR(50) DEFAULT 'Pending';
        `);
        console.log("Successfully added validation_status column.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        pool.end();
    }
};

migrate();
