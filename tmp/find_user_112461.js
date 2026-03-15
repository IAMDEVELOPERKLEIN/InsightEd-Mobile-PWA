
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function findUser() {
  try {
    const res = await pool.query(
      "SELECT uid, email, email_address, school_id, registrant_type, last_name, password_hash FROM users WHERE school_id = $1 OR last_name = $1 OR email = $1 OR email_address = $1",
      ['112461']
    );
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

findUser();
