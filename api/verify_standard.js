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
    console.table(res.rows);
    await pool.end();
    process.exit(0);
}

verify();
