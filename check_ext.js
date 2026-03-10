import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkExtensions() {
    try {
        const res = await pool.query("SELECT * FROM pg_extension;");
        console.log("Available Extensions:");
        console.table(res.rows);
    } catch (err) {
        console.error("Error checking extensions:", err);
    } finally {
        await pool.end();
    }
}

checkExtensions();
