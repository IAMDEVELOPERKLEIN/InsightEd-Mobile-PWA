require('dotenv').config();
const pg = require('pg');
const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: (process.env.DATABASE_URL || '').includes('localhost') ? false : { rejectUnauthorized: false } 
});

async function checkSchema() {
  try {
    if (!process.env.DATABASE_URL) {
       console.error("DATABASE_URL is not defined in .env");
       process.exit(1);
    }
    console.log("Using URL:", process.env.DATABASE_URL.split('@')[1]); // Log host part
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'engineer_form'");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
checkSchema();
