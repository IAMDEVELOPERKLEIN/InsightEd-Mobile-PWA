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

pool.query("UPDATE users SET account_category = 'HRODI Engineer' WHERE role = 'HRODI Engineer' AND account_category = 'EFD Engineer'", (err, res) => {
    console.log(err || 'Fixed ' + (res ? res.rowCount : 0) + ' HRODI Engineer accounts');
    process.exit();
});
