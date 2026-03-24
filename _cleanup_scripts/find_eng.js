
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function findEng() {
  try {
    console.log("Listing all users with role 'DepEd Engineer' or 'Division Engineer'...");
    const res = await pool.query("SELECT uid, email, role, first_name FROM users WHERE role IN ('DepEd Engineer', 'Division Engineer', 'HRODI Engineer', 'Non-DepEd Engineer')");
    res.rows.forEach(r => console.log(` - UID: ${r.uid}, Role: ${r.role}, Name: ${r.first_name}, Email: ${r.email}`));

  } catch (err) {
    console.error("Error finding engineers:", err);
  } finally {
    await pool.end();
  }
}

findEng();
