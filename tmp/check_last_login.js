
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkLastLogin() {
    try {
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'last_login'
        `);
        if (res.rows.length > 0) {
            console.log("last_login exists");
        } else {
            console.log("last_login DOES NOT exist");
        }
    } catch (err) {
        console.error("Error checking columns:", err.message);
    } finally {
        await pool.end();
    }
}

checkLastLogin();
