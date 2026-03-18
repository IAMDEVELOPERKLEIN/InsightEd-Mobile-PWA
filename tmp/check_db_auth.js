
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
    console.log("Checking tables...");
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log("Tables:", tables.rows.map(r => r.table_name).join(', '));

    console.log("\nChecking 'users' columns...");
    const userCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'");
    console.table(userCols.rows);

    console.log("\nChecking for School ID 111841...");
    const schoolIdCheck = await pool.query("SELECT uid, email, school_id, hash_version FROM users WHERE school_id = '111841'");
    console.log("User 111841 found:", schoolIdCheck.rowCount > 0);
    if (schoolIdCheck.rowCount > 0) {
      console.log("User Data:", schoolIdCheck.rows[0]);
    }

    console.log("\nChecking environment variables...");
    console.log("ADMIN_MASTER_PASSWORD set:", !!process.env.ADMIN_MASTER_PASSWORD);
    console.log("FIREBASE_HASH_SIGNER_KEY set:", !!process.env.FIREBASE_HASH_SIGNER_KEY);
    console.log("JWT_SECRET set:", !!process.env.JWT_SECRET);

  } catch (err) {
    console.error("Error during check:", err);
  } finally {
    await pool.end();
  }
}

check();
