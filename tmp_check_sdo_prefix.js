import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function checkSdoPrefix() {
  const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    const res = await pool.query(`SELECT * FROM "schools_IERN" WHERE "SchoolID" LIKE 'SDO%'`);
    console.log("SDO Prefix Entries:", res.rows);
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

checkSdoPrefix();
