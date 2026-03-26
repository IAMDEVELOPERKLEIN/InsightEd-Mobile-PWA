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

async function diag() {
  try {
    console.log("Checking connection...");
    const timeRes = await pool.query('SELECT NOW()');
    console.log("Connection OK, server time:", timeRes.rows[0].now);

    console.log("\nChecking 'users' table columns:");
    const res = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY column_name
    `);
    
    const columns = res.rows.map(r => r.column_name);
    console.log("Found columns:", columns.join(', '));

    const requiredColumns = [
        'uid', 'email', 'role', 'first_name', 'last_name', 
        'region', 'division', 'province', 'city', 'barangay', 
        'office', 'position', 'contact_number', 'alt_email', 
        'account_category', 'password_hash', 'hash_version', 'passcode'
    ];

    console.log("\nMissing columns check:");
    requiredColumns.forEach(cat => {
        if (!columns.includes(cat)) {
            console.log(`❌ MISSING: ${cat}`);
        } else {
            console.log(`✅ OK: ${cat}`);
        }
    });

  } catch (err) {
    console.error("DIAGNOSTIC ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

diag();
