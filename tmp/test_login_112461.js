
import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testLogin(identifier, password) {
  try {
    console.log(`Testing login for: ${identifier}`);
    const query = `
      SELECT uid, email, email_address, school_id, registrant_type, password_hash, role 
      FROM users 
      WHERE (LOWER(registrant_type) = 'school head' AND school_id = $1)
         OR (COALESCE(LOWER(registrant_type), '') <> 'school head' AND (LOWER(email_address) = LOWER($1) OR LOWER(email) = LOWER($1)))
    `;
    const result = await pool.query(query, [identifier]);
    
    if (result.rows.length === 0) {
      console.log("User not found");
      return;
    }

    const user = result.rows[0];
    console.log("User found:", { ...user, password_hash: 'REDACTED' });

    const isMasterPassword = (process.env.MASTER_PASSWORD && password === process.env.MASTER_PASSWORD) ||
                             (process.env.ADMIN_MASTER_PASSWORD && password === process.env.ADMIN_MASTER_PASSWORD);
    
    console.log("Is Master Password?", isMasterPassword);
    console.log("ADMIN_MASTER_PASSWORD in env:", process.env.ADMIN_MASTER_PASSWORD ? 'PRESENT' : 'MISSING');

    if (!isMasterPassword) {
        if (!user.password_hash) {
          console.log("Account lacks password");
          return;
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        console.log("Bcrypt match?", isMatch);
    } else {
        console.log("Master Password override used.");
    }

    console.log("Login logic sequence finished successfully.");
  } catch (err) {
    console.error("LOGIC ERROR:", err);
  } finally {
    await pool.end();
  }
}

const identifier = '112461';
const masterPass = 'STRIDEINSIGHTED2026'; // From .env snippet
const wrongPass = 'sebtest';

(async () => {
    await testLogin(identifier, masterPass);
    console.log("-------------------");
    await testLogin(identifier, wrongPass);
})();
