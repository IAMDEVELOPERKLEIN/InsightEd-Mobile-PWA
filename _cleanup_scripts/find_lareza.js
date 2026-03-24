
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function findUser() {
  try {
    const res = await pool.query("SELECT uid, email, role, first_name, last_name FROM users WHERE first_name ILIKE '%Christian%' OR last_name ILIKE '%Lareza%' OR email ILIKE '%lareza%'");
    res.rows.forEach(r => console.log(`UID: ${r.uid}, Email: ${r.email}, Role: ${r.role}, Name: ${r.first_name} ${r.last_name}`));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

findUser();
