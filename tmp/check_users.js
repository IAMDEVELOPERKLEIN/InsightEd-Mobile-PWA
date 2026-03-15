import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/postgres';

const pool = new Pool({
  connectionString: dbUrl
});

async function checkUsers() {
  const emails = [
    'wilfredo.cabral@deped.gov.ph',
    'marian.efondo@deped.gov.ph',
    'dexter.pante@deped.gov.ph'
  ];
  
  try {
    for (const email of emails) {
      console.log(`Checking ${email}...`);
      const res = await pool.query('SELECT uid, email, role, registrant_type FROM users WHERE LOWER(email) = LOWER($1)', [email]);
      if (res.rows.length > 0) {
        console.log(`Found:`, res.rows[0]);
      } else {
        console.log(`Not found in 'users' table.`);
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkUsers();
