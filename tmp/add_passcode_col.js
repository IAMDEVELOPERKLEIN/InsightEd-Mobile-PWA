import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS passcode VARCHAR(6);');
    console.log('Successfully added passcode column');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
