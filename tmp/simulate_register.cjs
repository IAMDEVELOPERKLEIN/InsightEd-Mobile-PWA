const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function simulateRegister() {
  const email = "test_engineer_" + Date.now() + "@deped.gov.ph";
  const password = "password123";
  const role = "Division Engineer";
  const firstName = "Test";
  const lastName = "Engineer";
  const region = "Region XI";
  const division = "Davao del Norte";
  const position = "Engineer IV";
  const contactNumber = "09123456789";

  const uid = uuidv4();
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const query = `
            INSERT INTO users (
                uid, email, role, created_at,
                first_name, last_name,
                region, division, province, city, barangay,
                office, position, contact_number, alt_email,
                account_category, password_hash, hash_version, passcode
            ) VALUES (
                $1, $2, $3, CURRENT_TIMESTAMP,
                $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
            )
        `;

  const values = [
    uid, email, role,
    firstName, lastName,
    region, division, null, null, null,
    null, position,
    contactNumber, null,
    role, passwordHash, 'bcrypt', null
  ];

  try {
    console.log("Simulating INSERT...");
    await pool.query(query, values);
    console.log("SUCCESS!");
  } catch (err) {
    console.error("FAILURE:", err);
  } finally {
    await pool.end();
  }
}

simulateRegister();
