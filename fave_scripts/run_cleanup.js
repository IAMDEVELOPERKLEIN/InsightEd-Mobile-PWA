import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runCleanup() {
  const sqlPath = path.join(__dirname, 'cleanup_locations.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('🚀 Starting location cleanup...');
  try {
    const client = await pool.connect();
    try {
      await client.query(sql);
      console.log('✅ Location cleanup successful!');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ Cleanup failed:', err.message);
  } finally {
    await pool.end();
  }
}

runCleanup();
