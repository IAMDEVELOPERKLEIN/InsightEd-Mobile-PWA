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

async function verify() {
    const res = await pool.query("SELECT account_category, COUNT(*) FROM users GROUP BY account_category ORDER BY count DESC");
    console.log("Database Account Categories Summary:");
    res.rows.forEach(row => {
        console.log(`- ${row.account_category || 'NULL'}: ${row.count}`);
    });

    const checks = ['Division Engineer', 'EFD Engineer', 'HRODI Engineer', 'EFD', 'HRODI'];
    const invalidCountRes = await pool.query("SELECT COUNT(*) FROM users WHERE account_category IN ($1, $2, $3, $4, $5)", checks);
    console.log("\nLegacy Categories remaining:", invalidCountRes.rows[0].count);

    if (invalidCountRes.rows[0].count === '0') {
        console.log("✅ SUCCESS: No legacy categories found.");
    } else {
        console.log("❌ WARNING: Some legacy categories still exist.");
    }

    await pool.end();
    process.exit(0);
}

verify();
