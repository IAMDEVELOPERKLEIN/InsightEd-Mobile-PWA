
import pg from 'pg';
import dotenv from 'dotenv';
import { runMigrations } from '../api/db_init.js';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runManually() {
    try {
        const client = await pool.connect();
        try {
            await runMigrations(client, "Manual Migration");
            console.log("Migration finished.");
        } finally {
            client.release();
        }
    } catch (err) {
        console.error("Migration failed:", err.message);
    } finally {
        await pool.end();
    }
}

runManually();
