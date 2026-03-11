
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function listAllUsers() {
  try {
    console.log("Listing all users (brief)...");
    const res = await pool.query("SELECT uid, email, role, first_name FROM users");
    res.rows.forEach(r => console.log(` - UID: ${r.uid}, Email: ${r.email}, Role: ${r.role}, Name: ${r.first_name}`));

  } catch (err) {
    console.error("Error listing users:", err);
  } finally {
    await pool.end();
  }
}

listAllUsers();
