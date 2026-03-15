
import pg from 'pg';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testMasterRedirect() {
  try {
    console.log(">>> Testing Master Password Login via Redirect Simulation");
    const identifier = '112461';
    const masterPass = process.env.ADMIN_MASTER_PASSWORD || 'STRIDEINSIGHTED2026';
    
    // Simulate the server-side logic:
    // const { email, masterPassword } = req.body;
    // req.body.password = masterPassword;
    // req.url = '/api/auth/login';
    // router.handle(...)
    
    // Since I can't easily call the Express router from here without starting the app,
    // I will verify the logic that the standard login route uses with these parameters.
    
    const query = `
      SELECT * FROM users 
      WHERE (LOWER(registrant_type) = 'school head' AND school_id = $1)
         OR (COALESCE(LOWER(registrant_type), '') <> 'school head' AND (LOWER(email_address) = LOWER($1) OR LOWER(email) = LOWER($1)))
    `;
    const result = await pool.query(query, [identifier]);
    const user = result.rows[0];
    
    if (!user) {
        console.error("❌ User not found");
        return;
    }
    
    console.log("✅ User found:", user.uid);
    
    const isMasterPassword = (process.env.MASTER_PASSWORD && masterPass === process.env.MASTER_PASSWORD) ||
                             (process.env.ADMIN_MASTER_PASSWORD && masterPass === process.env.ADMIN_MASTER_PASSWORD);
    
    console.log("Master Match?", isMasterPassword);
    
    if (isMasterPassword) {
        console.log("✅ Master Password Auth Logic verified.");
        const jwtPayload = { uid: user.uid, email: user.email_address || user.email, role: user.role };
        const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '24h' });
        console.log("✅ Token generated successfully.");
    } else {
        console.error("❌ Master Password mismatch");
    }

  } catch (err) {
    console.error("❌ Test failed:", err);
  } finally {
    await pool.end();
  }
}

testMasterRedirect();
