
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function findDepEdEng() {
  try {
    const res = await pool.query("SELECT uid, email, role FROM users WHERE role = 'DepEd Engineer'");
    res.rows.forEach(r => console.log(`UID: ${r.uid}, Email: ${r.email}, Role: ${r.role}`));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

findDepEdEng();
