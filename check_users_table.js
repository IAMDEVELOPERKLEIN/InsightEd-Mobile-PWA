import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);
    fs.writeFileSync('schema_out.json', JSON.stringify(res.rows, null, 2), 'utf8');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
