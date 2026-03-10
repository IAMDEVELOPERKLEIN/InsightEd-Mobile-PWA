import dotenv from 'dotenv';
import pg from 'pg';
import fs from 'fs';

dotenv.config();

const { Pool } = pg;

let dbUrl = process.env.DATABASE_URL;
if (!dbUrl && fs.existsSync('.env')) {
  try {
    let envContent = fs.readFileSync('.env', 'utf16le');
    let match = envContent.match(/DATABASE_URL=(.+)/);
    if (!match) {
      envContent = fs.readFileSync('.env', 'utf8');
      match = envContent.match(/DATABASE_URL=(.+)/);
    }
    if (match) {
      dbUrl = match[1].trim().replace(/^['"]|['"]$/g, '');
    }
  } catch (e) {
    console.error("⚠️ Failed to manually parse .env:", e.message);
  }
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function verify() {
  try {
    const res = await pool.query("SELECT category, count(*) as count FROM ph_subjects GROUP BY category ORDER BY category;");
    for (const row of res.rows) {
      console.log(`${row.category}: ${row.count}`);
    }
    const total = await pool.query("SELECT count(*) as count FROM ph_subjects;");
    console.log(`Total: ${total.rows[0].count}`);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

verify();
