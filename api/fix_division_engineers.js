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

pool.query("UPDATE users SET role = 'DepEd Engineer', account_category = 'DepEd Engineer' WHERE role = 'Division Engineer'", (err, res) => {
    console.log(err || 'Fixed ' + (res ? res.rowCount : 0) + ' Division Engineer accounts to DepEd Engineer');
    process.exit();
});
