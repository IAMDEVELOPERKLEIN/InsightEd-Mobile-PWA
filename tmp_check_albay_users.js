
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const dbUrl = process.env.DATABASE_URL;
const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function checkAlbayUsers() {
  try {
    const res = await pool.query("SELECT COUNT(*) FROM users WHERE UPPER(TRIM(division)) = 'ALBAY'");
    console.log(`Registered users in Albay division: ${res.rows[0].count}`);
    await pool.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkAlbayUsers();
