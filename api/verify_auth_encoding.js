import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log('Database URL loaded:', process.env.DATABASE_URL ? 'YES' : 'NO');

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

async function checkPasscodeType() {
  const res = await pool.query(`
    SELECT data_type, character_maximum_length 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'passcode'
  `);
  console.log('--- Passcode Column Info ---');
  console.table(res.rows);
}

async function verifyEncoding() {
  const testEmail = `verify_encoding_${uuidv4().slice(0, 8)}@example.com`;
  const testPassword = 'TestPassword123!';
  const testPin = '123456';

  console.log(`\n🚀 Starting Auth Encoding Verification for: ${testEmail}`);

  try {
    await checkPasscodeType();
    // 1. Register a test user
    console.log('--- Step 1: Registering User ---');
    const regRes = await fetch(`${BASE_URL}/api/register-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        role: 'DepEd Engineer',
        firstName: 'Verify',
        lastName: 'Encoding'
      })
    });

    const regData = await regRes.json();
    if (!regRes.ok) throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
    console.log('✅ Registration successful.');

    // 2. Check Database for Password Hash
    console.log('--- Step 2: Checking Password Hash in Database ---');
    const userRes = await pool.query('SELECT password_hash, hash_version FROM users WHERE email = $1', [testEmail]);
    const user = userRes.rows[0];
    
    console.log(`Hash Version: ${user.hash_version}`);
    console.log(`Password Hash: ${user.password_hash}`);
    
    if (user.hash_version === 'bcrypt' && user.password_hash.startsWith('$2b$')) {
      console.log('✅ Password hash is valid bcrypt.');
    } else {
      throw new Error('❌ Password hash is NOT valid bcrypt.');
    }

    // 3. Setup PIN
    console.log('--- Step 3: Setting up PIN ---');
    const pinSetupRes = await fetch(`${BASE_URL}/api/auth/setup-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        pin: testPin
      })
    });

    const pinSetupData = await pinSetupRes.json();
    if (!pinSetupRes.ok) throw new Error(`PIN Setup failed: ${JSON.stringify(pinSetupData)}`);
    console.log('✅ PIN Setup successful.');

    // 4. Check Database for Hashed PIN (Passcode)
    console.log('--- Step 4: Checking Passcode Hash in Database ---');
    const pinCheckRes = await pool.query('SELECT passcode FROM users WHERE email = $1', [testEmail]);
    const storedPasscode = pinCheckRes.rows[0].passcode;
    
    console.log(`Stored Passcode: ${storedPasscode}`);
    
    if (storedPasscode.startsWith('$2b$')) {
      console.log('✅ Passcode is validly hashed (bcrypt).');
    } else if (storedPasscode === testPin) {
      throw new Error('❌ Passcode is STORED IN PLAIN TEXT!');
    } else {
      throw new Error('❌ Passcode is stored in an unknown format.');
    }

    // 5. Test PIN Login
    console.log('--- Step 5: Testing PIN Login ---');
    const pinLoginRes = await fetch(`${BASE_URL}/api/auth/pin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        pin: testPin
      })
    });

    const pinLoginData = await pinLoginRes.json();
    if (!pinLoginRes.ok) throw new Error(`PIN Login failed: ${JSON.stringify(pinLoginData)}`);
    console.log('✅ PIN Login successful (verification passed).');

    // 6. Test Incorrect PIN
    console.log('--- Step 6: Testing Incorrect PIN ---');
    const badLoginRes = await fetch(`${BASE_URL}/api/auth/pin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        pin: '000000'
      })
    });

    if (badLoginRes.status === 401) {
      console.log('✅ Incorrect PIN correctly rejected.');
    } else {
      throw new Error(`❌ Bad PIN was not rejected correctly. Status: ${badLoginRes.status}`);
    }

    console.log('\n✨ ALL ENCODING VERIFICATION TESTS PASSED! ✨');

  } catch (err) {
    console.error(`\n❌ VERIFICATION FAILED: ${err.message}`);
  } finally {
    // Cleanup
    await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
    console.log(`🗑️ Cleaned up test user: ${testEmail}`);
    await pool.end();
    process.exit(0);
  }
}

verifyEncoding();
