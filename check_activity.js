
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkActivity() {
  try {
    console.log("Checking all active queries...");
    const res = await pool.query("SELECT pid, age(query_start, clock_timestamp()) as age, state, query FROM pg_stat_activity WHERE state != 'idle'");
    res.rows.forEach(r => {
      console.log(`PID: ${r.pid}, Age: ${r.age}, State: ${r.state}, Query: ${r.query.substring(0, 100)}`);
    });

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

checkActivity();
