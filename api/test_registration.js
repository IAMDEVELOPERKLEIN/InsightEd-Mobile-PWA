import fetch from 'node-fetch';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runTests() {
  const BASE_URL = 'http://localhost:3000';

  console.log('Testing DepEd Engineer Registration...');
  const res1 = await fetch(`${BASE_URL}/api/register-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'testdeped1@deped.gov.ph',
      password: 'testpassword123',
      role: 'DepEd Engineer',
      firstName: 'Test',
      lastName: 'DepEdEng',
      region: 'Region I',
      division: 'Division I',
      position: 'Engineer II',
      contactNumber: '09123456789'
    })
  });
  const data1 = await res1.json();
  console.log('DepEd Engineer Response:', data1);

  console.log('\nTesting Non-DepEd Engineer Registration...');
  const res2 = await fetch(`${BASE_URL}/api/register-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'testnondeped1@dummy.gov.ph', // Note: email validation in backend doesn't enforce @deped.gov.ph (that's frontend), but it will still insert
      password: 'testpassword123',
      role: 'Non-DepEd Engineer',
      firstName: 'Test',
      lastName: 'NonDepEdEng',
      region: 'Region II',
      division: 'Division II',
      position: 'Engineer III',
      contactNumber: '09987654321'
    })
  });
  const data2 = await res2.json();
  console.log('Non-DepEd Engineer Response:', data2);

  // Verify in database
  console.log('\nVerifying in Database...');
  const dbRes = await pool.query(
    "SELECT email, role, account_category FROM users WHERE email IN ('testdeped1@deped.gov.ph', 'testnondeped1@dummy.gov.ph') ORDER BY email"
  );
  console.log('Database Records:');
  console.table(dbRes.rows);

  // Cleanup test users
  await pool.query("DELETE FROM users WHERE email IN ('testdeped1@deped.gov.ph', 'testnondeped1@dummy.gov.ph')");
  console.log('Test users removed.');

  process.exit(0);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
