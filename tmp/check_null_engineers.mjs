import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const res = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'Division Engineer' AND (password_hash IS NULL OR account_category IS NULL OR hash_version IS NULL)");
    console.log("Division Engineers with potential issues:", res.rows[0].count);
    
    if (res.rows[0].count > 0) {
        const samples = await pool.query("SELECT email, account_category, hash_version, password_hash FROM users WHERE role = 'Division Engineer' AND (password_hash IS NULL OR account_category IS NULL OR hash_version IS NULL) LIMIT 5");
        console.log("Samples:", JSON.stringify(samples.rows, null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
