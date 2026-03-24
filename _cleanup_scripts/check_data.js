import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const result = await pool.query(`
    SELECT * FROM teachers_list LIMIT 1;
  `);
  console.log(JSON.stringify(result.rows, null, 2));
  process.exit(0);
}
run();
