
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function test() {
  console.log("Connecting...");
  const client = await pool.connect();
  try {
    console.log("Setting lock_timeout...");
    await client.query('SET lock_timeout = 10000'); // 10 seconds
    
    console.log("Attempting Segment 0.2 query...");
    await client.query(`
      ALTER TABLE engineer_form 
      ADD COLUMN IF NOT EXISTS pow_pdf TEXT,
      ADD COLUMN IF NOT EXISTS dupa_pdf TEXT,
      ADD COLUMN IF NOT EXISTS contract_pdf TEXT,
      ADD COLUMN IF NOT EXISTS engineer_id TEXT;
    `);
    console.log("SUCCESS!");
  } catch (err) {
    console.error("FAILURE:", err.message);
    if (err.detail) console.error("Detail:", err.detail);
    if (err.hint) console.error("Hint:", err.hint);
  } finally {
    client.release();
    await pool.end();
  }
}

test();
