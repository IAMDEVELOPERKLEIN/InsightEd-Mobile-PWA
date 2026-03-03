import dotenv from 'dotenv';
import fs from 'fs';
import pg from 'pg';
const { Pool } = pg;

// Load the exact .env using dotenv which understands its format
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function run() {
    try {
        const res = await pool.query("SELECT * FROM information_schema.columns WHERE table_name = 'engineer_form' AND column_name = 'funds_utilized'");
        if (res.rows.length > 0) {
            fs.writeFileSync("db_result.txt", "YES: funds_utilized exists");
        } else {
            fs.writeFileSync("db_result.txt", "NO: funds_utilized does not exist");
        }
    } catch (e) {
        fs.writeFileSync("db_result.txt", "ERROR: " + e.message);
    }
    pool.end();
}
run();
