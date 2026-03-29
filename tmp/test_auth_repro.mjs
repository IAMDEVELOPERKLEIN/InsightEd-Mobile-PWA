import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testLogin(email, password) {
  try {
    const SELECT_COLS = `uid, email, role, region, division, office, account_category, passcode, password_hash, password_salt, hash_version, first_name, last_name, school_id, province, city`;
    const query = `SELECT ${SELECT_COLS} FROM users WHERE LOWER(email) = $1`;
    const userRes = await pool.query(query, [email.toLowerCase()]);
    
    if (userRes.rowCount === 0) {
      console.log("User not found");
      return;
    }
    
    const user = userRes.rows[0];
    let isValid = false;
    
    if (user.hash_version === 'bcrypt') {
      isValid = await bcrypt.compare(password, user.password_hash);
    }
    
    console.log("Password valid:", isValid);
    
    if (isValid) {
      // Normalize
      let finalCategory = user.account_category;
      if (!finalCategory || user.role === 'Division Engineer') {
         finalCategory = 'Division Engineer';
      }
      
      if (finalCategory !== user.account_category) {
        console.log("Updating category to:", finalCategory);
        await pool.query('UPDATE users SET account_category = $1 WHERE uid = $2', [finalCategory, user.uid]);
      }
      
      const token = jwt.sign(
        { uid: user.uid, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'fallback',
        { expiresIn: '30d' }
      );
      console.log("Token generated successfully");
    }
  } catch (err) {
    console.error("CRITICAL ERROR DURING TEST:", err);
  } finally {
    await pool.end();
  }
}

// Based on my check, baztybazty@deped.gov.ph is a Division Engineer
testLogin('baztybazty@deped.gov.ph', 'Master123!'); // I don't know the password, but this tests the logic
