const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function diag() {
  try {
    console.log("Checking connection...");
    const timeRes = await pool.query('SELECT NOW()');
    console.log("Connection OK, server time:", timeRes.rows[0].now);

    console.log("\nChecking 'users' table columns:");
    const res = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY column_name
    `);
    res.rows.forEach(row => {
      console.log(` - ${row.column_name}: ${row.data_type} (Nullable: ${row.is_nullable})`);
    });

    if (process.env.NEW_DATABASE_URL) {
      console.log("\nChecking Secondary DB connection...");
      const poolNew = new Pool({
        connectionString: process.env.NEW_DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      const timeResNew = await poolNew.query('SELECT NOW()');
      console.log("Secondary Connection OK, server time:", timeResNew.rows[0].now);
      
      console.log("\nChecking 'users' table columns in Secondary DB:");
      const resNew = await poolNew.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'users'
        ORDER BY column_name
      `);
      resNew.rows.forEach(row => {
        console.log(` - ${row.column_name}: ${row.data_type} (Nullable: ${row.is_nullable})`);
      });
      await poolNew.end();
    }

  } catch (err) {
    console.error("DIAGNOSTIC ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

diag();
