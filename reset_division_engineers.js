import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const DEFAULT_PASSWORD = 'InsightEd2026!';
const TARGET_ROLE = 'Division Engineer';

async function resetPasswords() {
  console.log(`🚀 Starting password reset for role: "${TARGET_ROLE}"...`);
  
  try {
    // 1. Hash the default password
    console.log(`🔐 Hashing default password: "${DEFAULT_PASSWORD}"...`);
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, saltRounds);
    
    // 2. Update the users table
    // We set password_hash, clear password_salt (since bcrypt doesn't need it),
    // and set hash_version to 'bcrypt'
    const query = `
      UPDATE users 
      SET 
        password_hash = $1, 
        password_salt = NULL, 
        hash_version = 'bcrypt' 
      WHERE role = $2
      RETURNING email, uid;
    `;
    
    const result = await pool.query(query, [passwordHash, TARGET_ROLE]);
    
    if (result.rowCount === 0) {
      console.log(`⚠️ No users found with role "${TARGET_ROLE}".`);
      // Double check if role name is slightly different (e.g. 'DepEd Engineer')
      const rolesRes = await pool.query("SELECT DISTINCT role FROM users");
      console.log("Current roles in DB:", rolesRes.rows.map(r => r.role));
    } else {
      console.log(`✅ Successfully reset ${result.rowCount} ${TARGET_ROLE} accounts.`);
      console.log("Reset accounts:");
      result.rows.forEach(user => console.log(` - ${user.email}`));
    }

  } catch (err) {
    console.error('❌ Error during password reset:', err.message);
  } finally {
    await pool.end();
  }
}

resetPasswords();
