import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import { createRequire } from "module";
const require = createRequire(import.meta.url);

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Assuming connection to remote DB
});

async function migrateUsers() {
  const usersPath = './users.json'; // Path to the Firebase export
  
  if (!fs.existsSync(usersPath)) {
    console.error(`❌ File not found: ${usersPath}`);
    process.exit(1);
  }

  // Read and parse the users.json file
  console.log('📖 Reading users.json...');
  let usersData;
  try {
    const rawData = fs.readFileSync(usersPath, 'utf8');
    usersData = JSON.parse(rawData);
  } catch (err) {
    console.error('❌ Failed to parse users.json:', err.message);
    process.exit(1);
  }

  const users = usersData.users || [];
  console.log(`✅ Found ${users.length} users in the JSON file.`);

  if (users.length === 0) {
    console.log('No users to migrate.');
    process.exit(0);
  }

  const batchSize = 1000;
  let successCount = 0;
  let errorCount = 0;

  try {
    // 1. Ensure the target columns exist in the users table
    console.log('🛠️ Checking/updating users table schema...');
    
    // Add columns if they don't exist. 
    // PostgreSQL's ADD COLUMN IF NOT EXISTS requires PG 9.6+, which is standard now.
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS password_hash TEXT,
      ADD COLUMN IF NOT EXISTS password_salt TEXT,
      ADD COLUMN IF NOT EXISTS hash_version TEXT DEFAULT 'firebase';
    `);
    console.log('✅ Schema check complete. target columns verified.');

    // 2. Process users in batches
    console.log('🚀 Starting migration...');
    
    // Filter users that actually have a passwordHash. 
    // Accounts created via Google/Facebook may not have one.
    const usersWithPasswords = users.filter(u => u.passwordHash && u.email);
    console.log(`Found ${usersWithPasswords.length} users with password hashes to migrate.`);

    for (let i = 0; i < usersWithPasswords.length; i += batchSize) {
      const batch = usersWithPasswords.slice(i, i + batchSize);
      console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(usersWithPasswords.length / batchSize)}...`);

      // We use a transaction for each batch to ensure all-or-nothing insertion for that chunk
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        for (const user of batch) {
          try {
            // Update the user record via their email.
            // If the user doesn't exist in the PG database yet, this update simply affects 0 rows.
            // If you want to INSERT them if they don't exist, change this to an UPSERT (INSERT ... ON CONFLICT).
            // Assuming your existing API logic handles user creation in PG, updating by email is safest.
            const query = `
              UPDATE users 
              SET 
                password_hash = $1, 
                password_salt = $2, 
                hash_version = 'firebase'
              WHERE email = $3
            `;
            const values = [user.passwordHash, user.salt, user.email];
            
            const res = await client.query(query, values);
            if (res.rowCount > 0) {
              successCount++;
            }
          } catch (err) {
            console.error(`Error migrating user ${user.email}:`, err.message);
            errorCount++;
          }
        }

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Batch transaction failed:', err.message);
      } finally {
        client.release();
      }
    }

    console.log('\n✅ Migration finished.');
    console.log(`   Successfully updated hashes for: ${successCount} users.`);
    console.log(`   Errors encountered: ${errorCount}`);
    
    if(successCount === 0) {
      console.log('⚠️ WARNING: 0 users were updated. Please check if the emails in users.json match the emails currently in your Postgres users table.');
    }

  } catch (err) {
    console.error('❌ Critical Migration Error:', err);
  } finally {
    await pool.end();
  }
}

migrateUsers();
