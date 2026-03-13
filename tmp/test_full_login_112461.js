
import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testFullLogin(identifier, password) {
  try {
    console.log(`\n>>> Testing Full Login Flow for: ${identifier}`);
    const query = `
      SELECT uid, email, email_address, school_id, registrant_type, password_hash, role 
      FROM users 
      WHERE (LOWER(registrant_type) = 'school head' AND school_id = $1)
         OR (COALESCE(LOWER(registrant_type), '') <> 'school head' AND (LOWER(email_address) = LOWER($1) OR LOWER(email) = LOWER($1)))
    `;
    const result = await pool.query(query, [identifier]);
    
    if (result.rows.length === 0) {
      console.log("❌ User not found");
      return;
    }

    const user = result.rows[0];
    console.log("✅ User found in DB");

    const isMasterPassword = (process.env.MASTER_PASSWORD && password === process.env.MASTER_PASSWORD) ||
                             (process.env.ADMIN_MASTER_PASSWORD && password === process.env.ADMIN_MASTER_PASSWORD);
    
    console.log("Master Password Match?", isMasterPassword);

    if (!isMasterPassword) {
        if (!user.password_hash) {
          console.log("❌ No password hash");
          return;
        }
        const isMatch = await bcrypt.compare(password, user.password_hash);
        console.log("Bcrypt Match?", isMatch);
        if (!isMatch) return;
    }

    console.log("Attempting to sign JWT...");
    const jwtPayload = { uid: user.uid, email: user.email_address || user.email, role: user.role };
    console.log("Payload:", jwtPayload);
    
    if (!process.env.JWT_SECRET) {
        console.error("❌ JWT_SECRET IS MISSING IN ENV");
        return;
    }

    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '24h' });
    console.log("✅ JWT Signed Successfully. Token Length:", token.length);

    const responseData = {
      success: true,
      token,
      user: {
        uid: user.uid,
        email: user.email_address || user.email,
        role: user.role,
        registrant_type: user.registrant_type,
        school_id: user.school_id
      }
    };
    
    console.log("✅ Response Data constructed. Serializing to JSON...");
    const json = JSON.stringify(responseData);
    console.log("✅ JSON Serialization successful. Length:", json.length);

  } catch (err) {
    console.error("❌ CRITICAL ERROR IN FLOW:", err);
  }
}

(async () => {
    const identifier = '112461';
    const masterPass = 'STRIDEINSIGHTED2026'; 
    await testFullLogin(identifier, masterPass);
    await pool.end();
})();
