import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const result = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
      AND table_name LIKE '%teacher%';
  `);
  console.log("Tables matching 'teacher':", result.rows.map(r => r.table_name));
  process.exit(0);
}
run();
